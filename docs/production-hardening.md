# Production Hardening Runbook

Run this after deploy and repeat monthly.

## Sentry

Backend is wired through `SENTRY_DSN`.

Set on the production host:

```bash
SENTRY_DSN=<backend-sentry-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.0
FRONTEND_SENTRY_DSN=<client-sentry-dsn>
ADMIN_SENTRY_DSN=<admin-sentry-dsn>
FRONTEND_SENTRY_TRACES_SAMPLE_RATE=0.0
```

Then redeploy:

```bash
cd /opt/forrent/backend
docker compose up -d --build
docker compose exec backend python manage.py check --settings=config.settings.production
```

Frontend Sentry is wired through `@sentry/nextjs`; set separate client/admin DSNs in `backend/.env` before rebuilding Docker images.

## Uptime and Alerting

The repo has `.github/workflows/uptime.yml` as a basic scheduled check. For production alerting, also create an external monitor in UptimeRobot, Better Stack, or HetrixTools:

- `https://forrent.io.vn`
- `https://admin.forrent.io.vn`
- `https://api.forrent.io.vn/api/health/`

Alert to email plus one real-time channel. Page immediately when API health fails twice in a row or 5xx stays above 5 minutes.

Minimum external monitor settings:

- Check interval: 1 minute for API, 5 minutes for client/admin.
- Timeout: 10 seconds.
- Retry before alert: 2 failed checks.
- API keyword check: response contains `"status":"ok"`.
- Alert channels: owner email plus one real-time channel.
- Maintenance window: add one before planned deploys.

## DAST

The repo has `.github/workflows/dast.yml` using OWASP ZAP baseline scan.

Run manually before major releases:

```bash
gh workflow run DAST -f target=https://forrent.io.vn
```

Keep the weekly scheduled run enabled. Treat new high-confidence alerts as release blockers.

## Backup Restore Proof

Create a backup:

```bash
cd /opt/forrent/backend
mkdir -p /opt/forrent-backups
docker compose exec -T postgres pg_dump -U rental_user rental_db > /opt/forrent-backups/forrent-$(date +%F).sql
```

Restore into a temporary database, never directly over production:

```bash
docker compose exec -T postgres createdb -U rental_user forrent_restore_test
docker compose exec -T postgres psql -U rental_user forrent_restore_test < /opt/forrent-backups/forrent-$(date +%F).sql
docker compose exec -T postgres psql -U rental_user -d forrent_restore_test -c "select count(*) from accounts_user;"
docker compose exec -T postgres dropdb -U rental_user forrent_restore_test
```

Record the date, backup file, restore result, and person who verified it.

## Secret Rotation

Rotate on this schedule:

- `DJANGO_SECRET_KEY`: every 6 months, or immediately after suspected leak.
- DB password: every 6 months.
- Cloudinary API secret: every 6 months.
- Email password/app password: every 6 months.
- Sentry auth token/source-map token: every 6 months.

After rotation:

```bash
cd /opt/forrent/backend
docker compose up -d --build
docker compose exec backend python manage.py check --settings=config.settings.production
curl https://api.forrent.io.vn/api/health/
```

## Staging

Use a separate database, Cloudinary folder/cloud, email mailbox, Sentry environment, and subdomains:

- `staging.forrent.io.vn`
- `staging-admin.forrent.io.vn`
- `staging-api.forrent.io.vn`

Never point staging at production `DATABASE_URL`.

Staging deploy files:

- `backend/docker-compose.staging.yml`
- `deploy/nginx/forrent-staging.conf`
- `deploy/staging/backend.env.example`
- `deploy/staging/README.md`

Staging client is forced `noindex` through `NEXT_PUBLIC_NOINDEX=true`.

## Pentest and Review

Before treating the app as enterprise-grade, schedule one independent review:

- Auth and authorization review.
- Admin privilege escalation review.
- File upload/media review.
- API DAST plus manual business-logic testing.
- Backup and incident-response tabletop test.

Store the report outside the repo if it contains sensitive findings.

Send this scope to the reviewer:

- Domains: production and staging URLs.
- Test window and timezone.
- Allowed testing: authenticated tenant, authenticated admin, unauthenticated public API, file upload, rate limit checks.
- Not allowed without written approval: destructive DB changes, spam email/SMS, DoS/load testing, social engineering.
- Provide two tenant test accounts and one limited admin test account.
- Require deliverables: executive summary, reproducible findings, severity, affected endpoint, evidence, remediation, retest result.

## Security Regression

Before release, run:

```bash
cd backend
python manage.py check --settings=config.settings.production
pytest apps/accounts apps/blogs apps/contacts apps/commissions apps/rooms apps/viewing_requests
pip-audit -r requirements.txt --strict

cd ../frontend-client
npm audit --audit-level=high
npm run lint
npm run build

cd ../frontend-admin
npm audit --audit-level=high
npm run lint
npm run build
```
