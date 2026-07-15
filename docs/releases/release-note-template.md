# Release Note Template

## Release

- Date:
- Production commit SHA:
- Previous production SHA:
- CI run URL:
- Deployed by:

## Changes

- User-facing:
- Admin/workflow:
- Security/ops:

## Verification

- Backend health: `https://api.forrent.io.vn/api/health/`
- Client smoke: `https://forrent.io.vn/`
- Admin smoke: `https://admin.forrent.io.vn/log-in`
- Sentry checked:
- External uptime monitor checked:

## Rollback

- Rollback SHA:
- Command: `sh deploy/ops/rollback-sha.sh <rollback-sha>`
- Data migration notes:
