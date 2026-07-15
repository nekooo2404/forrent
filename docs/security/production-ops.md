# Production Security Ops

## Release Gate

Không deploy production nếu thiếu một trong các bằng chứng sau:

- CI xanh cho backend PostgreSQL/Redis, frontend build, E2E production-mode, `pip-audit`, `npm audit`, Trivy.
- Commit SHA đang chạy trên server trùng SHA GitHub release.
- `DJANGO_DEBUG=False`, `EXPOSE_API_DOCS=False`, domain/CORS/CSRF đúng production.
- Container chạy non-root UID `10001`; volume `backend/media` và `backend/staticfiles` đã `chown` cho UID/GID `10001`.
- External uptime monitor có alert tới email/Zalo/Slack/Telegram, không chỉ GitHub Actions cron.
- Restore drill gần nhất thành công trong vòng 30 ngày.

## Server Deploy Hygiene

Production chỉ deploy commit SHA đã qua CI xanh. Không deploy bằng `git pull` trực tiếp.

```bash
cd /opt/forrent
sh deploy/ops/deploy-sha.sh <ci-green-commit-sha>
```

Script sẽ từ chối dirty worktree, kiểm tra SHA thuộc `origin/main`, bắt buộc `RELEASE_NOTE_PATH` trỏ tới file release note local không rỗng, rebuild container, chạy migration/check và smoke các URL trong `PUBLIC_URLS`.
Mặc định `PUBLIC_URLS` gồm client `/`, admin `/log-in` và API `/api/health/`.
Script cũng bắt buộc `main` đang được branch protection và tìm thấy cả workflow `CI` lẫn `Container Security` thành công cho SHA đó qua GitHub CLI:

```bash
gh auth status
RELEASE_NOTE_PATH=/opt/forrent-release-notes/<ci-green-commit-sha>.md sh deploy/ops/deploy-sha.sh <ci-green-commit-sha>
```

Server cần `gh` đã đăng nhập hoặc `GH_TOKEN` có quyền đọc Actions của repo.

Release note nên tạo ngoài worktree để không làm server dirty:

```bash
sudo mkdir -p /opt/forrent-release-notes
sudo cp docs/releases/release-note-template.md /opt/forrent-release-notes/<ci-green-commit-sha>.md
sudo nano /opt/forrent-release-notes/<ci-green-commit-sha>.md
```

Rollback dùng SHA tốt gần nhất:

```bash
cd /opt/forrent
RELEASE_NOTE_PATH=/opt/forrent-release-notes/rollback-<previous-good-commit-sha>.md sh deploy/ops/rollback-sha.sh <previous-good-commit-sha>
```

Rollback cũng smoke cùng `PUBLIC_URLS`; nếu homepage/admin/API còn lỗi 5xx thì rollback không được xem là hoàn tất.

Mỗi deploy phải có release note ngắn theo `docs/releases/release-note-template.md`, gồm SHA deploy, SHA rollback, CI URL, smoke check và migration notes.

## External Uptime Monitor

GitHub Actions cron chỉ là smoke check phụ. Production cần monitor ngoài hạ tầng GitHub với alert SLA:

- URLs: `https://forrent.io.vn/`, `https://admin.forrent.io.vn/log-in`, `https://api.forrent.io.vn/api/health/`.
- Interval: 1 phút cho API health, 5 phút cho client/admin.
- Alert sau 2 lần fail liên tiếp.
- Người nhận: owner kỹ thuật và vận hành.
- Ghi lại provider, monitor IDs, escalation channel và ngày test alert.

## Staging Environment

Staging phải tách production:

- Domain riêng: `staging.forrent.io.vn`, `staging-admin.forrent.io.vn`, `staging-api.forrent.io.vn`.
- Database, Redis, Cloudinary folder/bucket và secrets riêng.
- `SENTRY_ENVIRONMENT=staging`.
- DAST authenticated scan chạy trên staging trước, không chạy full active scan trực tiếp vào production.
- Seed data không chứa dữ liệu khách thật.

## Backup Restore Drill

Run this after each production backup change and at least monthly:

```bash
cd /opt/forrent
pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" "$POSTGRES_DB" > /tmp/forrent-backup.sql
COMPOSE_FILE=backend/docker-compose.yml sh deploy/ops/restore-drill.sh /tmp/forrent-backup.sql
```

Evidence to keep: command output, backup timestamp, restore-drill database name, operator, and result.

Record every drill in `docs/security/restore-drill-log.md` or an external ticket with immutable timestamp.

## Secret Rotation

Rotate these at least quarterly and immediately after any suspected leak:

- `DJANGO_SECRET_KEY`
- database password
- Cloudinary API secret
- email SMTP password
- GitHub/deployment tokens
- Sentry DSN if exposed publicly by mistake

Use separate staging and production secrets. Rotate staging first, deploy, verify login/upload/email, then rotate production.

Secrets that have ever appeared in chat, tickets, screenshots, logs, CI output or shell history must be rotated immediately. Rotation is not complete until old credentials are revoked and upload/login/email/Sentry verification passes.

## Frontend Error Tracking

Client and admin use `@sentry/nextjs`. Production env must set:

- `FRONTEND_SENTRY_DSN`
- `ADMIN_SENTRY_DSN`
- `SENTRY_ENVIRONMENT=production`
- `FRONTEND_SENTRY_TRACES_SAMPLE_RATE=0.0` unless there is an explicit tracing budget.

Use separate Sentry projects for client, admin and backend if possible. Do not enable default PII collection without legal approval.

## Authenticated DAST

Unauthenticated ZAP baseline is only the first layer. Before a major release, run authenticated DAST against staging:

- user flow: register/login, profile update, viewing request.
- admin flow: login, room CRUD, image upload, deposit type CRUD, role update.
- API flow: token refresh/logout, CSRF/origin rejection, object-level authorization.

Use `.github/workflows/authenticated-dast.yml` after staging is deployed. Required GitHub Actions secrets:

- `STAGING_TENANT_IDENTIFIER`
- `STAGING_TENANT_PASSWORD`
- `STAGING_ADMIN_IDENTIFIER`
- `STAGING_ADMIN_PASSWORD`

Run it manually against staging URLs only:

```bash
gh workflow run "Authenticated DAST" \
  -f client_url=https://staging.forrent.io.vn \
  -f admin_url=https://staging-admin.forrent.io.vn
```

Use staging-only scan accounts, rotate or recreate them after each scan, and keep report artifacts to the shortest practical retention period. Do not run destructive active scans against production.

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
curl --fail --silent --show-error --location --connect-timeout 10 --max-time 20 -I https://api.forrent.io.vn/api/docs/
```

Production should also have at least one of: Cloudflare WAF, provider WAF, fail2ban/nginx ban rules, or equivalent reverse-proxy protection. Keep screenshots/config export proving rules are enabled for auth/API paths.

Fail2ban templates are included:

- `deploy/fail2ban/filter.d/forrent-nginx-auth.conf`
- `deploy/fail2ban/jail.d/forrent-nginx-auth.local`

Install them on the server, reload fail2ban, then verify the jail is active:

```bash
sudo cp deploy/fail2ban/filter.d/forrent-nginx-auth.conf /etc/fail2ban/filter.d/
sudo cp deploy/fail2ban/jail.d/forrent-nginx-auth.local /etc/fail2ban/jail.d/
sudo fail2ban-client reload
sudo fail2ban-client status forrent-nginx-auth
```

## Upload Content Policy

Image upload limits are not enough for enterprise. Required controls:

- accepted MIME allowlist: JPEG, PNG, WebP, AVIF.
- server-side size and dimension limits.
- random storage names, no user-controlled public IDs.
- malware scan or Cloudinary moderation/add-on before publishing public assets.
- reject SVG/scriptable formats for room images.
- log upload actor, room ID, content type, file size and storage public ID.

Set `CLOUDINARY_UPLOAD_MODERATION` only after the corresponding Cloudinary moderation/add-on is enabled and tested in staging.

## Logs And Metrics

Required dashboards/alerts:

- backend 5xx rate, p95 latency, DB connection errors, Redis errors.
- frontend server-side exceptions and route-level 500 count.
- auth failures, role changes, password changes, admin CRUD, upload failures.
- Celery worker failures and queue latency.
- disk usage for Postgres/media/static volumes.

## Repository Governance

Enable branch protection on `main`:

- required review before merge.
- required CI checks: backend, frontend, E2E, DAST baseline, Trivy.
- block force push and deletion.
- require linear history or squash merge.
- require secret scanning/push protection.
