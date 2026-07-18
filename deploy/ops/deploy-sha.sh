#!/usr/bin/env sh
set -eu

SHA="${1:-}"
COMPOSE_FILE="${COMPOSE_FILE:-backend/docker-compose.yml}"
STEP_TIMEOUT="${STEP_TIMEOUT:-300}"
PUBLIC_URLS="${PUBLIC_URLS:-https://forrent.io.vn/ https://admin.forrent.io.vn/log-in https://api.forrent.io.vn/api/health/}"
CLIENT_HOMEPAGE_URL="${CLIENT_HOMEPAGE_URL:-https://forrent.io.vn/homepage}"
CLIENT_CANONICAL_HOME_URL="${CLIENT_CANONICAL_HOME_URL:-https://forrent.io.vn/}"
REQUIRE_LISTING_HERO="${REQUIRE_LISTING_HERO:-1}"
AUTO_REBUILD_FRONTEND_ON_HERO_FAIL="${AUTO_REBUILD_FRONTEND_ON_HERO_FAIL:-1}"
RUN_PUBLIC_ROOM_QUALITY_AUDIT="${RUN_PUBLIC_ROOM_QUALITY_AUDIT:-1}"
AUTO_SANITIZE_PUBLIC_ROOM_TITLES="${AUTO_SANITIZE_PUBLIC_ROOM_TITLES:-0}"
SANITIZE_PUBLIC_ROOM_STATUSES="${SANITIZE_PUBLIC_ROOM_STATUSES:-PUBLISHED}"
PUBLIC_ROOM_QUALITY_ARGS="${PUBLIC_ROOM_QUALITY_ARGS:-}"
REPO_SLUG="${GITHUB_REPOSITORY:-nekooo2404/forrent}"
REQUIRED_CI_WORKFLOW="${REQUIRED_CI_WORKFLOW:-CI}"
REQUIRED_SECURITY_WORKFLOW="${REQUIRED_SECURITY_WORKFLOW:-Container Security}"
RELEASE_NOTE_PATH="${RELEASE_NOTE_PATH:-}"

if [ -z "$PUBLIC_ROOM_QUALITY_ARGS" ]; then
  PUBLIC_ROOM_QUALITY_ARGS="--require-cloudinary"
fi

run_step() {
  timeout "$STEP_TIMEOUT" "$@"
}

check_public_urls() {
  for url in ${PUBLIC_URLS}; do
    curl --fail --silent --show-error --location --retry 3 --retry-delay 3 --connect-timeout 10 --max-time 20 "$url" >/dev/null
  done
}

check_homepage_canonical_redirect() {
  canonical_without_slash="${CLIENT_CANONICAL_HOME_URL%/}"
  status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --connect-timeout 10 --max-time 20 "$CLIENT_HOMEPAGE_URL")"
  location="$(curl --silent --show-error --head --output - --connect-timeout 10 --max-time 20 "$CLIENT_HOMEPAGE_URL" | tr -d '\r' | awk -F': ' 'tolower($1) == "location" { print $2; exit }')"

  case "$status" in
    301|308)
      case "$location" in
        "$CLIENT_CANONICAL_HOME_URL"|"$canonical_without_slash"|"/")
          return
          ;;
      esac
      echo "Homepage legacy URL redirects with status $status but Location is '$location', expected '$CLIENT_CANONICAL_HOME_URL' or '/'." >&2
      exit 1
      ;;
  esac

  echo "Legacy homepage URL $CLIENT_HOMEPAGE_URL returned HTTP $status instead of redirecting to canonical $CLIENT_CANONICAL_HOME_URL." >&2
  echo "This usually means frontend_client is serving an old Next build or reverse proxy/CDN cache." >&2
  exit 1
}

fetch_homepage_for_hero_check() {
  HOMEPAGE_CHECK_BODY="$(curl --fail --silent --show-error --location --retry 3 --retry-delay 3 --connect-timeout 10 --max-time 20 "$CLIENT_CANONICAL_HOME_URL")"
}

homepage_listing_hero_is_live() {
  fetch_homepage_for_hero_check
  printf '%s' "$HOMEPAGE_CHECK_BODY" | grep -Fq 'data-hero-source="listing"' &&
    ! printf '%s' "$HOMEPAGE_CHECK_BODY" | grep -Fq "forrent-hero-old-quarter.jpg" &&
    ! printf '%s' "$HOMEPAGE_CHECK_BODY" | grep -Fq "/_next/image?url=https%3A%2F%2Fres.cloudinary.com"
}

explain_homepage_hero_failure() {
  echo "Homepage hero is not using a listing image. Expected data-hero-source=\"listing\" after frontend deploy." >&2
  if printf '%s' "$HOMEPAGE_CHECK_BODY" | grep -Fq "forrent-hero-old-quarter.jpg"; then
    echo "Detected fallback hero image /brand/forrent-hero-old-quarter.jpg." >&2
  fi
  if printf '%s' "$HOMEPAGE_CHECK_BODY" | grep -Fq "/_next/image?url=https%3A%2F%2Fres.cloudinary.com"; then
    echo "Detected double optimization: Cloudinary image is still routed through Next /_next/image." >&2
  fi
}

check_homepage_listing_hero() {
  if [ "$REQUIRE_LISTING_HERO" != "1" ]; then
    return
  fi

  if homepage_listing_hero_is_live; then
    return
  fi

  explain_homepage_hero_failure

  if [ "$AUTO_REBUILD_FRONTEND_ON_HERO_FAIL" = "1" ]; then
    echo "Attempting one no-cache rebuild of frontend_client, then rechecking homepage hero." >&2
    run_step docker compose -f "$COMPOSE_FILE" build --no-cache frontend_client
    run_step docker compose -f "$COMPOSE_FILE" up -d frontend_client
    if homepage_listing_hero_is_live; then
      echo "Homepage listing hero check passed after frontend_client no-cache rebuild." >&2
      return
    fi
    explain_homepage_hero_failure
  fi

  echo "Rebuild frontend_client, clear reverse proxy/CDN cache, and re-run the UI/UX field probe before claiming the hero gate." >&2
  echo "Set REQUIRE_LISTING_HERO=0 only for an emergency deploy with explicitly accepted UI/UX evidence debt." >&2
  exit 1
}

check_production_hardening() {
  health="$(curl --fail --silent --show-error --max-time 20 https://api.forrent.io.vn/api/health/)"
  for expected in '"status": "ok"' '"database": true' '"cache": true' '"media_storage": true'; do
    if ! printf '%s' "$health" | grep -Fq "$expected"; then
      echo "Production health response is missing $expected." >&2
      exit 1
    fi
  done

  headers="$(curl --fail --silent --show-error --head --max-time 20 https://forrent.io.vn/ | tr -d '\r')"
  server="$(printf '%s\n' "$headers" | awk -F': ' 'tolower($1) == "server" { print $2; exit }')"
  case "$server" in
    */*)
      echo "Production Server header exposes a version: $server" >&2
      exit 1
      ;;
  esac

  csp="$(printf '%s\n' "$headers" | awk -F': ' 'tolower($1) == "content-security-policy" { print $2; exit }')"
  if [ -z "$csp" ] || printf '%s' "$csp" | grep -Eq "unsafe-inline|supabase|googleusercontent"; then
    echo "Production CSP is missing or contains a forbidden source." >&2
    exit 1
  fi
}

sanitize_public_room_titles() {
  for status in ${SANITIZE_PUBLIC_ROOM_STATUSES}; do
    run_step docker compose -f "$COMPOSE_FILE" exec backend \
      python manage.py sanitize_public_room_titles --status "$status" --apply
  done
}

check_public_room_title_dry_run() {
  changed_total=0
  for status in ${SANITIZE_PUBLIC_ROOM_STATUSES}; do
    output="$(
      run_step docker compose -f "$COMPOSE_FILE" exec backend \
        python manage.py sanitize_public_room_titles --status "$status"
    )"
    printf '%s\n' "$output"
    changed="$(printf '%s\n' "$output" | awk -F'changed=' '/mode=dry_run/ { print $2 }' | awk '{ print $1 }' | tail -n 1)"
    changed="${changed:-0}"
    case "$changed" in
      ''|*[!0-9]*)
        echo "Could not parse sanitize_public_room_titles changed count for status $status." >&2
        exit 1
        ;;
    esac
    changed_total=$((changed_total + changed))
  done

  if [ "$changed_total" -gt 0 ]; then
    echo "Public room titles still contain internal codes, emoji, or campaign/status copy." >&2
    echo "Review the dry-run output above, then either clean the data manually or set AUTO_SANITIZE_PUBLIC_ROOM_TITLES=1 for this deploy." >&2
    exit 1
  fi
}

check_public_room_quality() {
  if [ "$RUN_PUBLIC_ROOM_QUALITY_AUDIT" != "1" ]; then
    return
  fi

  if [ "$AUTO_SANITIZE_PUBLIC_ROOM_TITLES" = "1" ]; then
    sanitize_public_room_titles
  else
    check_public_room_title_dry_run
  fi

  run_step docker compose -f "$COMPOSE_FILE" exec backend \
    python manage.py audit_public_room_quality $PUBLIC_ROOM_QUALITY_ARGS
}

check_workflow_green() {
  workflow="$1"
  if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI 'gh' is required to verify CI before production deploy." >&2
    exit 1
  fi

  if ! run_count="$(run_step gh run list --repo "$REPO_SLUG" --workflow "$workflow" --commit "$SHA" --status success --limit 1 --json conclusion --jq 'length')"; then
    echo "Unable to verify '$workflow' status for $SHA." >&2
    exit 1
  fi

  if [ "$run_count" != "1" ]; then
    echo "Refusing to deploy $SHA: no successful '$workflow' workflow run found." >&2
    exit 1
  fi
}

check_branch_protection() {
  if [ "$(run_step gh api "repos/$REPO_SLUG/branches/main" --jq '.protected')" != "true" ]; then
    echo "Refusing to deploy: GitHub branch protection is not enabled on main." >&2
    exit 1
  fi
}

check_release_note() {
  if [ -z "$RELEASE_NOTE_PATH" ]; then
    echo "Refusing to deploy $SHA: set RELEASE_NOTE_PATH to a non-empty release note file." >&2
    exit 1
  fi

  if [ ! -s "$RELEASE_NOTE_PATH" ]; then
    echo "Refusing to deploy $SHA: release note $RELEASE_NOTE_PATH is missing or empty." >&2
    exit 1
  fi

  if [ "${RELEASE_NOTE_PATH##*/}" = "release-note-template.md" ]; then
    echo "Refusing to deploy with the release note template. Copy it to a deployment-specific file first." >&2
    exit 1
  fi
}

if [ -z "$SHA" ]; then
  echo "Usage: deploy/ops/deploy-sha.sh <commit-sha>" >&2
  exit 2
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Refusing to deploy from a dirty worktree. Commit, stash, or discard local changes first." >&2
  git status --short >&2
  exit 1
fi

run_step git fetch origin main
git cat-file -e "$SHA^{commit}"
git merge-base --is-ancestor "$SHA" origin/main
check_release_note
check_branch_protection
check_workflow_green "$REQUIRED_CI_WORKFLOW"
check_workflow_green "$REQUIRED_SECURITY_WORKFLOW"
git checkout --detach "$SHA"

sudo chown -R 10001:10001 backend/media backend/staticfiles 2>/dev/null || true

run_step docker compose -f "$COMPOSE_FILE" build --pull
run_step docker compose -f "$COMPOSE_FILE" up -d
run_step docker compose -f "$COMPOSE_FILE" exec backend python manage.py migrate --noinput
run_step docker compose -f "$COMPOSE_FILE" exec backend python manage.py check --settings=config.settings.production
check_public_room_quality
check_public_urls
check_homepage_canonical_redirect
check_homepage_listing_hero
check_production_hardening

echo "Deployed commit: $(git rev-parse --short HEAD)"
