# Celery Architecture

ForRent uses Celery for work that should not extend an HTTP request: transactional email, appointment reminders, and bounded maintenance. PostgreSQL remains the source of truth; Redis is the broker, short-lived result backend, and coordination store.

## Queues And Priority

| Queue | Priority | Workload |
| --- | ---: | --- |
| `critical` | 9 | OTP email |
| `notifications` | 5-7 | Viewing-request, appointment-confirmation, and reminder email |
| `maintenance` | 2-9 | Pipeline heartbeat, auth cleanup, and reminder fan-out |
| `default` | 5 | Explicit fallback for registered tasks without a specialized route |

Unknown queues are disabled with `CELERY_TASK_CREATE_MISSING_QUEUES=False`. Redis priority emulation uses priority levels 0-9. The production worker listens only to the four declared queues.

## Delivery Guarantees

- Tasks are JSON-only, persistent, late-acknowledged, and rejected if a worker process is lost.
- Worker prefetch is one so urgent OTP work is not hidden behind reserved notification work.
- Email tasks retry only transient network, Sendify 408/425/429/5xx, and database connection errors. Permanent Sendify 4xx responses fail immediately.
- Publish retries protect the short interval between a database commit and broker acceptance.
- Redis completion keys make email handlers idempotent across retries. Delivery remains at-least-once at the provider boundary; true exactly-once delivery requires provider-supported idempotency.
- OTP task results are not stored. Publish metadata redacts task arguments, but the broker must still carry the OTP payload; access to the durable Redis instance must remain private.
- Maintenance tasks keep non-sensitive count results for one hour.

## Periodic Work

Celery Beat schedules:

- Every minute: write a short-lived pipeline heartbeat. `GET /api/health/celery/` proves Beat, broker, worker, and coordination Redis are all functioning.
- Daily at 03:15: delete expired JWT records and OTP records older than `AUTH_TOKEN_RETENTION_DAYS`.
- Daily at 08:00: fan out one reminder for each confirmed viewing appointment on the following day.

Batch tasks use date-scoped Redis locks and completion keys, so a retry or accidental second Beat process does not repeat the batch. Production must still run exactly one Beat container.

## Worker Lifecycle

Defaults are tuned for the current two-core server:

- `CELERY_WORKER_CONCURRENCY=2`
- `CELERY_WORKER_MAX_TASKS_PER_CHILD=200`
- `CELERY_WORKER_MAX_MEMORY_PER_CHILD=256000` KiB
- Global soft/hard limits are 90/120 seconds; external email tasks use 30/45 seconds.
- Graceful shutdown allows one minute for in-flight worker tasks.

Scale workers horizontally only after queue age or runtime data shows sustained backlog. Do not increase concurrency beyond available CPU and database capacity.

## Operations

```bash
docker compose -f backend/docker-compose.yml ps
docker compose -f backend/docker-compose.yml logs --tail=200 celery_worker celery_beat
docker compose -f backend/docker-compose.yml exec celery_worker celery -A config inspect ping
docker compose -f backend/docker-compose.yml exec celery_worker celery -A config inspect active
docker compose -f backend/docker-compose.yml exec celery_worker celery -A config inspect reserved
docker compose -f backend/docker-compose.yml exec celery_worker celery -A config inspect scheduled
docker compose -f backend/docker-compose.yml exec celery_worker celery -A config inspect stats
curl -fsS https://api.forrent.io.vn/api/health/celery/
```

Do not use `celery purge` in production unless queued work has been reviewed and data loss is explicitly accepted.

## Alerts

Alert when any condition persists:

- `/api/health/celery/` is non-200 for more than three minutes.
- The oldest queued critical task exceeds one minute.
- The oldest notification task exceeds five minutes.
- A task exhausts retries or repeatedly reaches its hard time limit.
- Worker restarts increase unexpectedly or Beat has more than one active instance.

Task lifecycle logs contain task ID, name, queue, state, retries, duration, root/parent IDs, and request ID. They deliberately omit positional and keyword arguments.
