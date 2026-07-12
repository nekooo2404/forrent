#!/usr/bin/env sh
set -eu

BACKUP_FILE="${1:-}"
COMPOSE_FILE="${COMPOSE_FILE:-backend/docker-compose.yml}"
STEP_TIMEOUT="${STEP_TIMEOUT:-300}"

run_step() {
  timeout "$STEP_TIMEOUT" "$@"
}

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "usage: COMPOSE_FILE=backend/docker-compose.yml sh deploy/ops/restore-drill.sh /path/to/backup.sql" >&2
  exit 2
fi

DRILL_DB="restore_drill_$(date +%Y%m%d%H%M%S)"

cleanup() {
  run_step docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'dropdb --if-exists -U "$POSTGRES_USER" "$1"' sh "$DRILL_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_step docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'createdb -U "$POSTGRES_USER" "$1"' sh "$DRILL_DB"
run_step docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1"' sh "$DRILL_DB" < "$BACKUP_FILE"
run_step docker compose -f "$COMPOSE_FILE" exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$1" -c "select count(*) from django_migrations;"' sh "$DRILL_DB"

echo "restore drill passed: $DRILL_DB"
