from .base import *  # noqa: F403

DEBUG = env("DJANGO_DEBUG", default=True)  # noqa: F405

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

if "sqlite" in DATABASES["default"]["ENGINE"]:  # noqa: F405
    CACHES = {  # noqa: F405
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "rental-local-cache",
        },
        "sessions": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "rental-local-sessions",
        },
        "coordination": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "rental-local-coordination",
        },
    }
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
