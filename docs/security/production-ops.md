# Production Security Ops

## Backup Restore Drill

Run this after each production backup change and at least monthly:

```bash
cd /opt/forrent
pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" "$POSTGRES_DB" > /tmp/forrent-backup.sql
COMPOSE_FILE=backend/docker-compose.yml sh deploy/ops/restore-drill.sh /tmp/forrent-backup.sql
```

Evidence to keep: command output, backup timestamp, restore-drill database name, operator, and result.

## Secret Rotation

Rotate these at least quarterly and immediately after any suspected leak:

- `DJANGO_SECRET_KEY`
- database password
- Cloudinary API secret
- email SMTP password
- GitHub/deployment tokens
- Sentry DSN if exposed publicly by mistake

Use separate staging and production secrets. Rotate staging first, deploy, verify login/upload/email, then rotate production.

## Independent Pentest

Scope for an external reviewer:

- public client: auth, profile, viewing request, blog submission, contact form
- admin: login, room CRUD, image upload, user role changes, lead/commission workflows
- API: auth throttling, object-level authorization, file upload validation, CORS/CSRF, security headers
- infra: nginx rate limits, hidden docs/schema in production, TLS/HSTS, backup restore evidence

Deliverable required before marking complete: findings list, severity, reproduction, fix verification, and retest date.

## Edge Rate Limit / WAF Proof

`deploy/nginx/forrent.conf` and `deploy/nginx/forrent-staging.conf` define:

- generic API limit: `10r/s`
- auth endpoint limit: `5r/m` for login, register, refresh, logout, OTP, profile, change-password, and password-reset
- `429` response for limited requests
- `/api/docs/` and `/api/schema/` blocked at edge

Verify after nginx reload:

```bash
nginx -t
curl -I https://api.forrent.io.vn/api/docs/
```
