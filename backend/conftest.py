import pytest
from django.conf import settings
from django.core.cache import caches


@pytest.fixture(autouse=True)
def isolate_cache_aliases():
    for alias in settings.CACHES:
        caches[alias].clear()
