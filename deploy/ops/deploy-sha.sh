#!/usr/bin/env sh
set -eu

SHA="${1:-}"
COMPOSE_FILE="${COMPOSE_FILE:-backend/docker-compose.yml}"
STEP_TIMEOUT="${STEP_TIMEOUT:-300}"
PUBLIC_URLS="${PUBLIC_URLS:-https://forrent.io.vn/homepage https://admin.forrent.io.vn/log-in https://api.forrent.io.vn/api/health/}"
REPO_SLUG="${GITHUB_REPOSITORY:-nekooo2404/forrent}"
REQUIRED_CI_WORKFLOW="${REQUIRED_CI_WORKFLOW:-CI}"
REQUIRED_SECURITY_WORKFLOW="${REQUIRED_SECURITY_WORKFLOW:-Container Security}"
RELEASE_NOTE_PATH="${RELEASE_NOTE_PATH:-}"

run_step() {
  timeout "$STEP_TIMEOUT" "$@"
}

check_public_urls() {
  for url in ${PUBLIC_URLS}; do
    curl --fail --silent --show-error --location --retry 3 --retry-delay 3 --connect-timeout 10 --max-time 20 "$url" >/dev/null
  done
}

check_production_hardening() {
  health="$(curl --fail --silent --show-error --max-time 20 https://api.forrent.io.vn/api/health/)"
  for expected in '"status": "ok"' '"database": true' '"cache": true' '"media_storage": true'; do
    if ! printf '%s' "$health" | grep -Fq "$expected"; then
      echo "Production health response is missing $expected." >&2
      exit 1
    fi
  done

  headers="$(curl --fail --silent --show-error --head --max-time 20 https://forrent.io.vn/homepage | tr -d '\r')"
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
check_public_urls
check_production_hardening

echo "Deployed commit: $(git rev-parse --short HEAD)"
