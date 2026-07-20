# Redis Architecture

ForRent uses Redis only where it improves latency, reliability, or abuse resistance. PostgreSQL remains the source of truth for rooms, users, leads, audit logs, and OTP records.

## Logical Databases

| Role | Default URL | Data policy |
| --- | --- | --- |
| Celery broker | `redis://redis:6379/0` | Durable through AOF; no eviction |
| Public response cache | `redis://redis_cache:6379/0` in Compose | Dedicated 256 MB instance with `allkeys-lru` |
| Celery results | `redis://redis:6379/2` | Results expire after one hour |
| Django session cache | `redis://redis:6379/3` | `cached_db` keeps PostgreSQL as fallback |
| Security and task coordination | `redis://redis:6379/4` | Durable throttles, OTP counters, cooldowns, locks, namespace versions, and send-once keys |

Compose separates disposable cache data from the durable Redis instance used by Celery, sessions, throttles, and coordination. The durable instance defaults to a 512 MB `noeviction` limit (`REDIS_DURABLE_MAXMEMORY`), while the disposable cache uses a 256 MB `allkeys-lru` limit. Outside Compose, omitting `REDIS_CACHE_URL` falls back to logical database 1 of `REDIS_URL`. Every URL can be overridden through `CELERY_BROKER_URL`, `REDIS_CACHE_URL`, `REDIS_RESULT_URL`, `REDIS_SESSION_URL`, and `REDIS_COORDINATION_URL`.

## Implemented Uses

- Public room lists, room details, filter options, blog lists, and blog details use cache-aside.
- Versioned namespaces invalidate in constant time without `KEYS` or pattern scans; version counters live in the durable coordination database so LRU eviction cannot resurrect stale values.
- Short Redis locks reduce cache stampedes during concurrent cache misses.
- Room, image, amenity, location, deposit, subtype, and blog model signals invalidate after the database transaction commits.
- DRF scoped throttles use the durable coordination Redis database so brute-force protection is not weakened by LRU eviction.
- OTP requests have a per-email and purpose cooldown; failed verification attempts are limited without storing raw OTP values.
- Celery email tasks use completion keys and locks to avoid duplicate delivery during retries.
- Celery uses late acknowledgement, one-task prefetching, result expiry, and separate broker/result key prefixes.
- Django sessions use Redis first and PostgreSQL as a durable fallback.

Redis Pub/Sub, Streams, geospatial indexes, and sorted-set rankings are intentionally not enabled because the current product has no real-time fan-out, event replay, proximity search, or ranking workflow that needs them.

Celery queue routing, retry semantics, schedules, health checks, and worker operations are documented in [`docs/celery.md`](celery.md).

Email delivery remains at-least-once at the provider boundary: a worker crash after Sendify accepts a message but before Redis records completion can still produce a retry. True exactly-once delivery requires an idempotency key supported and persisted by the email provider.

## Operations

Run diagnostics from the server:

```bash
docker compose -f backend/docker-compose.yml exec redis redis-cli INFO memory
docker compose -f backend/docker-compose.yml exec redis redis-cli INFO keyspace
docker compose -f backend/docker-compose.yml exec redis redis-cli INFO persistence
docker compose -f backend/docker-compose.yml exec redis redis-cli LATENCY DOCTOR
docker compose -f backend/docker-compose.yml exec redis_cache redis-cli INFO memory
docker compose -f backend/docker-compose.yml exec redis_cache redis-cli --scan --pattern 'forrent:*' | head
```

Do not use `FLUSHALL` or `KEYS *` in production. Cache invalidation is performed by namespace version increments. AOF data is stored in the `redis_data` Docker volume and must be included in infrastructure backup monitoring, although PostgreSQL remains authoritative.

## Capacity Alerts

Alert when any of these conditions persist:

- `used_memory` exceeds 75% of the Redis host allocation.
- `blocked_clients` is greater than zero.
- `evicted_keys` increases. The production policy is `noeviction` to protect the Celery broker.
- `aof_last_write_status` is not `ok`.
- Cache, session-cache, or coordination-cache health checks fail at `/api/health/`.
- Celery queue depth or oldest-task age grows continuously.
