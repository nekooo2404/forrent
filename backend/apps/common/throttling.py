from django.core.cache import caches
from rest_framework.throttling import ScopedRateThrottle

from apps.common.cache_utils import CoordinationServiceUnavailable


class CoordinationScopedRateThrottle(ScopedRateThrottle):
    cache = caches["coordination"]

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception as exc:
            raise CoordinationServiceUnavailable() from exc
