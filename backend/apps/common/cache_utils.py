import hashlib
import logging
import secrets
import time
from collections.abc import Callable
from typing import TypeVar
from urllib.parse import urlencode

from django.core.cache import cache, caches
from rest_framework.exceptions import APIException
from rest_framework.response import Response


logger = logging.getLogger(__name__)
T = TypeVar("T")
_MISSING = object()

ROOM_LIST_CACHE_NAMESPACE = "public:rooms:list"
ROOM_DETAIL_CACHE_NAMESPACE = "public:rooms:detail"
ROOM_FILTER_CACHE_NAMESPACE = "public:rooms:filters"
BLOG_LIST_CACHE_NAMESPACE = "public:blogs:list"
BLOG_DETAIL_CACHE_NAMESPACE = "public:blogs:detail"


class CoordinationServiceUnavailable(APIException):
    status_code = 503
    default_detail = "The verification and request-protection service is temporarily unavailable."
    default_code = "coordination_unavailable"


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _version_key(namespace: str) -> str:
    return f"namespace:{namespace}:version"


def _namespace_version(namespace: str) -> int:
    coordination_cache = caches["coordination"]
    key = _version_key(namespace)
    version = coordination_cache.get(key)
    if version is None:
        coordination_cache.add(key, 1, timeout=None)
        version = coordination_cache.get(key, 1)
    return int(version)


def invalidate_cache_namespace(namespace: str) -> int:
    coordination_cache = caches["coordination"]
    key = _version_key(namespace)
    try:
        if coordination_cache.add(key, 2, timeout=None):
            version = 2
        else:
            try:
                version = coordination_cache.incr(key)
            except ValueError:
                coordination_cache.set(key, 2, timeout=None)
                version = 2
    except Exception:
        logger.exception(
            "cache_namespace_invalidation_failed",
            extra={"event": "cache_error", "cache_namespace": namespace, "cache_status": "unavailable"},
        )
        return 0
    logger.info(
        "cache_namespace_invalidated",
        extra={"event": "cache_namespace_invalidated", "cache_namespace": namespace},
    )
    return int(version)


def invalidate_cache_namespaces(*namespaces: str) -> None:
    for namespace in dict.fromkeys(namespaces):
        invalidate_cache_namespace(namespace)


def get_or_set_versioned(
    namespace: str,
    identity: str,
    producer: Callable[[], T],
    *,
    timeout: int,
    lock_timeout: int = 10,
    wait_timeout: float = 0.75,
) -> tuple[T, bool]:
    try:
        version = _namespace_version(namespace)
        identity_digest = _digest(identity)
        value_key = f"value:{namespace}:v{version}:{identity_digest}"
        cached_value = cache.get(value_key, _MISSING)
    except Exception:
        logger.exception(
            "cache_read_failed",
            extra={"event": "cache_error", "cache_namespace": namespace, "cache_status": "unavailable"},
        )
        return producer(), False
    if cached_value is not _MISSING:
        logger.debug(
            "cache_hit",
            extra={"event": "cache_hit", "cache_namespace": namespace, "cache_status": "hit"},
        )
        return cached_value, True

    lock_key = f"lock:{namespace}:v{version}:{identity_digest}"
    token = secrets.token_urlsafe(18)
    try:
        acquired = cache.add(lock_key, token, timeout=lock_timeout)
    except Exception:
        logger.exception(
            "cache_lock_failed",
            extra={"event": "cache_error", "cache_namespace": namespace, "cache_status": "unavailable"},
        )
        return producer(), False
    if not acquired:
        deadline = time.monotonic() + wait_timeout
        while time.monotonic() < deadline:
            time.sleep(0.025)
            try:
                cached_value = cache.get(value_key, _MISSING)
            except Exception:
                break
            if cached_value is not _MISSING:
                logger.debug(
                    "cache_hit_after_wait",
                    extra={"event": "cache_hit", "cache_namespace": namespace, "cache_status": "hit_after_wait"},
                )
                return cached_value, True

    value = producer()
    try:
        cache.set(value_key, value, timeout=timeout)
    except Exception:
        logger.exception(
            "cache_write_failed",
            extra={"event": "cache_error", "cache_namespace": namespace, "cache_status": "unavailable"},
        )
    else:
        logger.debug(
            "cache_miss",
            extra={"event": "cache_miss", "cache_namespace": namespace, "cache_status": "miss"},
        )
    finally:
        if acquired:
            try:
                if cache.get(lock_key) == token:
                    cache.delete(lock_key)
            except Exception:
                logger.debug("cache_lock_release_failed", exc_info=True)
    return value, False


def execute_once(
    operation_key: str,
    operation: Callable[[], T],
    *,
    done_timeout: int,
    lock_timeout: int = 60,
    cache_alias: str = "default",
) -> tuple[T | None, bool]:
    cache_backend = caches[cache_alias]
    operation_digest = _digest(operation_key)
    done_key = f"once:done:{operation_digest}"
    try:
        if cache_backend.get(done_key):
            return None, False

        lock_key = f"once:lock:{operation_digest}"
        token = secrets.token_urlsafe(18)
        if not cache_backend.add(lock_key, token, timeout=lock_timeout):
            return None, False
    except Exception:
        logger.exception("idempotency_cache_unavailable", extra={"event": "cache_error"})
        return operation(), True

    try:
        try:
            if cache_backend.get(done_key):
                return None, False
        except Exception:
            logger.exception("idempotency_recheck_failed", extra={"event": "cache_error"})
            return operation(), True
        result = operation()
        try:
            cache_backend.set(done_key, True, timeout=done_timeout)
        except Exception:
            logger.exception("idempotency_completion_write_failed", extra={"event": "cache_error"})
        return result, True
    finally:
        try:
            if cache_backend.get(lock_key) == token:
                cache_backend.delete(lock_key)
        except Exception:
            logger.debug("idempotency_lock_release_failed", exc_info=True)


def increment_with_ttl(key: str, *, timeout: int, cache_alias: str = "default") -> int:
    cache_backend = caches[cache_alias]
    if cache_backend.add(key, 1, timeout=timeout):
        return 1
    try:
        return int(cache_backend.incr(key))
    except ValueError:
        cache_backend.set(key, 1, timeout=timeout)
        return 1


def canonical_request_identity(request, allowed_query_parameters=None) -> str:
    query_items = []
    for name in sorted(request.query_params):
        if allowed_query_parameters is not None and name not in allowed_query_parameters:
            continue
        query_items.extend((name, value) for value in request.query_params.getlist(name))
    query = urlencode(query_items, doseq=True)
    return f"{request.path}?{query}" if query else request.path


class PublicResponseCacheMixin:
    public_cache_namespaces: dict[str, str] = {}
    public_cache_timeouts: dict[str, int] = {}
    public_cache_query_parameters: set[str] = set()

    def _cached_public_response(self, action, request, producer):
        namespace = self.public_cache_namespaces[action]
        timeout = self.public_cache_timeouts[action]

        def response_payload():
            response = producer()
            return {
                "data": response.data,
                "status_code": response.status_code,
            }

        payload, hit = get_or_set_versioned(
            namespace,
            canonical_request_identity(
                request,
                self.public_cache_query_parameters if action == "list" else set(),
            ),
            response_payload,
            timeout=timeout,
        )
        response = Response(payload["data"], status=payload["status_code"])
        response["X-Cache"] = "HIT" if hit else "MISS"
        return response

    def list(self, request, *args, **kwargs):
        return self._cached_public_response(
            "list",
            request,
            lambda: super(PublicResponseCacheMixin, self).list(request, *args, **kwargs),
        )

    def retrieve(self, request, *args, **kwargs):
        return self._cached_public_response(
            "retrieve",
            request,
            lambda: super(PublicResponseCacheMixin, self).retrieve(request, *args, **kwargs),
        )
