import os
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

required_environment = (
    "DJANGO_SECRET_KEY",
    "DATABASE_URL",
    "REDIS_URL",
    "DJANGO_ALLOWED_HOSTS",
    "CORS_ALLOWED_ORIGINS",
    "CSRF_TRUSTED_ORIGINS",
)
missing_environment = [name for name in required_environment if not os.environ.get(name)]
if missing_environment:
    raise ImproperlyConfigured(f"Production requires: {', '.join(missing_environment)}.")
if len(SECRET_KEY) < 32 or SECRET_KEY.startswith("unsafe-"):  # noqa: F405
    raise ImproperlyConfigured("Production requires a strong DJANGO_SECRET_KEY.")
if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":  # noqa: F405
    raise ImproperlyConfigured("Production requires DATABASE_URL for PostgreSQL.")
redis_service_urls = (  # noqa: F405
    REDIS_URL,
    REDIS_CACHE_URL,
    REDIS_RESULT_URL,
    REDIS_SESSION_URL,
    REDIS_COORDINATION_URL,
    CELERY_BROKER_URL,
    CELERY_RESULT_BACKEND,
)
if any(not url.startswith(("redis://", "rediss://")) for url in redis_service_urls):
    raise ImproperlyConfigured("Production requires valid Redis service URLs.")
if (
    CELERY_WORKER_CONCURRENCY < 1  # noqa: F405
    or CELERY_WORKER_MAX_TASKS_PER_CHILD < 1  # noqa: F405
    or CELERY_WORKER_MAX_MEMORY_PER_CHILD < 64_000  # noqa: F405
    or CELERY_PIPELINE_HEARTBEAT_TTL <= 60  # noqa: F405
):
    raise ImproperlyConfigured("Production Celery worker and heartbeat limits are invalid.")
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS or not CORS_ALLOWED_ORIGINS or not CSRF_TRUSTED_ORIGINS:  # noqa: F405
    raise ImproperlyConfigured("Production hosts and CORS/CSRF origins must be explicitly configured.")
if not (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET):  # noqa: F405
    raise ImproperlyConfigured("Production requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.")

DEBUG = False
EXPOSE_API_DOCS = False
AUDIT_LOG_FAIL_CLOSED = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_HSTS_SECONDS = 63072000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]
