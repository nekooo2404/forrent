import base64
import importlib.util
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import environ
from celery.schedules import crontab
from kombu import Queue

BASE_DIR = Path(__file__).resolve().parents[2]

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
    JWT_ACCESS_TOKEN_LIFETIME=(int, 60),
    JWT_REFRESH_TOKEN_LIFETIME=(int, 1440),
    EMAIL_PORT=(int, 465),
    EMAIL_USE_TLS=(bool, False),
    EMAIL_USE_SSL=(bool, True),
    EMAIL_TIMEOUT=(int, 15),
    SENDIFY_API_TIMEOUT=(int, 15),
    CELERY_TASK_ALWAYS_EAGER=(bool, False),
    CELERY_TASK_EAGER_PROPAGATES=(bool, False),
    CELERY_RESULT_EXPIRES=(int, 3600),
    CELERY_WORKER_CONCURRENCY=(int, 2),
    CELERY_WORKER_MAX_TASKS_PER_CHILD=(int, 200),
    CELERY_WORKER_MAX_MEMORY_PER_CHILD=(int, 256000),
    CELERY_PIPELINE_HEARTBEAT_TTL=(int, 180),
    REDIS_MAX_CONNECTIONS=(int, 50),
    REDIS_SOCKET_TIMEOUT=(float, 2.0),
    OTP_REQUEST_COOLDOWN_SECONDS=(int, 60),
    OTP_MAX_ATTEMPTS=(int, 5),
    OTP_ATTEMPT_WINDOW_SECONDS=(int, 600),
    AUTH_TOKEN_RETENTION_DAYS=(int, 30),
    APPOINTMENT_REMINDERS_ENABLED=(bool, True),
    SENTRY_TRACES_SAMPLE_RATE=(float, 0.0),
    EXPOSE_API_DOCS=(bool, False),
    AUDIT_LOG_FAIL_CLOSED=(bool, False),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="unsafe-local-development-key-for-rental-backend-please-change")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")
EXPOSE_API_DOCS = env("EXPOSE_API_DOCS", default=DEBUG)
AUDIT_LOG_FAIL_CLOSED = env("AUDIT_LOG_FAIL_CLOSED")

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.common",
    "apps.accounts",
    "apps.locations",
    "apps.rooms",
    "apps.viewing_requests",
    "apps.blogs",
    "apps.contacts",
    "apps.commissions",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.common.middleware.RequestIDMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]
if importlib.util.find_spec("argon2"):
    PASSWORD_HASHERS.insert(0, "django.contrib.auth.hashers.Argon2PasswordHasher")

LANGUAGE_CODE = "vi"
TIME_ZONE = "Asia/Ho_Chi_Minh"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", default="")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", default="")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", default="")
CLOUDINARY_UPLOAD_MODERATION = env("CLOUDINARY_UPLOAD_MODERATION", default="")

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    STORAGES = {
        "default": {
            "BACKEND": "apps.common.storage.CloudinaryMediaStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": (
        "apps.common.renderers.StandardJSONRenderer",
    ),
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 12,
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "apps.common.throttling.CoordinationScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "logout": "30/min",
        "register": "5/min",
        "password_reset": "5/min",
        "viewing_request": "5/min",
        "contact": "5/min",
        "landlord_room_write": "60/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_TOKEN_LIFETIME")),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=env("JWT_REFRESH_TOKEN_LIFETIME")),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "CHECK_REVOKE_TOKEN": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Rental Website Backend API",
    "DESCRIPTION": "Enterprise backend for room rental listings, tenant leads, and commissions.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {
        "UserRoleEnum": [("TENANT", "Tenant"), ("LANDLORD", "Landlord"), ("SALER", "Saler/Admin")],
        "RoomTypeEnum": [("CCMN", "Chung cu mini"), ("CCDV", "Can ho dich vu"), ("HOUSE", "Nha nguyen can")],
        "RoomStatusEnum": [
            ("DRAFT", "Draft"),
            ("PENDING_REVIEW", "Pending review"),
            ("PUBLISHED", "Published"),
            ("RENTED", "Rented"),
            ("HIDDEN", "Hidden"),
            ("ARCHIVED", "Archived"),
        ],
        "ViewingRequestStatusEnum": [
            ("NEW", "New"),
            ("CONTACTED", "Contacted"),
            ("SCHEDULED", "Scheduled"),
            ("VIEWED", "Viewed"),
            ("CONVERTED", "Converted"),
            ("CANCELLED", "Cancelled"),
            ("NO_SHOW", "No show"),
        ],
        "BlogStatusEnum": [("DRAFT", "Draft"), ("PUBLISHED", "Published"), ("HIDDEN", "Hidden")],
        "ContactMessageStatusEnum": [("NEW", "New"), ("READ", "Read"), ("HANDLED", "Handled")],
    },
}

def redis_url_for_db(base_url, database):
    parsed = urlsplit(base_url)
    return urlunsplit((parsed.scheme, parsed.netloc, f"/{database}", parsed.query, parsed.fragment))


REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")
REDIS_CACHE_URL = env("REDIS_CACHE_URL", default=redis_url_for_db(REDIS_URL, 1))
REDIS_RESULT_URL = env("REDIS_RESULT_URL", default=redis_url_for_db(REDIS_URL, 2))
REDIS_SESSION_URL = env("REDIS_SESSION_URL", default=redis_url_for_db(REDIS_URL, 3))
REDIS_COORDINATION_URL = env("REDIS_COORDINATION_URL", default=redis_url_for_db(REDIS_URL, 4))
REDIS_MAX_CONNECTIONS = env("REDIS_MAX_CONNECTIONS")
REDIS_SOCKET_TIMEOUT = env("REDIS_SOCKET_TIMEOUT")
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default=REDIS_RESULT_URL)
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = env("CELERY_TASK_ALWAYS_EAGER")
CELERY_TASK_EAGER_PROPAGATES = env(
    "CELERY_TASK_EAGER_PROPAGATES",
    default=CELERY_TASK_ALWAYS_EAGER,
)
CELERY_RESULT_EXPIRES = env("CELERY_RESULT_EXPIRES")
CELERY_WORKER_CONCURRENCY = env("CELERY_WORKER_CONCURRENCY")
CELERY_WORKER_MAX_TASKS_PER_CHILD = env("CELERY_WORKER_MAX_TASKS_PER_CHILD")
CELERY_WORKER_MAX_MEMORY_PER_CHILD = env("CELERY_WORKER_MAX_MEMORY_PER_CHILD")
CELERY_PIPELINE_HEARTBEAT_TTL = env("CELERY_PIPELINE_HEARTBEAT_TTL")
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_ENABLE_UTC = True
CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_TASK_DEFAULT_EXCHANGE = "default"
CELERY_TASK_DEFAULT_ROUTING_KEY = "default"
CELERY_TASK_DEFAULT_PRIORITY = 5
CELERY_TASK_DEFAULT_DELIVERY_MODE = 2
CELERY_TASK_INHERIT_PARENT_PRIORITY = True
CELERY_TASK_CREATE_MISSING_QUEUES = False
CELERY_TASK_QUEUES = (
    Queue("critical", routing_key="critical"),
    Queue("notifications", routing_key="notifications"),
    Queue("maintenance", routing_key="maintenance"),
    Queue("default", routing_key="default"),
)
CELERY_TASK_ROUTES = {
    "apps.accounts.tasks.send_otp_email": {"queue": "critical", "priority": 9},
    "apps.accounts.tasks.cleanup_expired_auth_records": {"queue": "maintenance", "priority": 2},
    "apps.viewing_requests.tasks.send_viewing_request_received_email": {
        "queue": "notifications",
        "priority": 5,
    },
    "apps.viewing_requests.tasks.send_appointment_confirmed_email": {
        "queue": "notifications",
        "priority": 7,
    },
    "apps.viewing_requests.tasks.send_appointment_reminder_email": {
        "queue": "notifications",
        "priority": 7,
    },
    "apps.viewing_requests.tasks.dispatch_appointment_reminders": {
        "queue": "maintenance",
        "priority": 5,
    },
    "apps.common.tasks.record_celery_heartbeat": {"queue": "maintenance", "priority": 9},
}
CELERY_TASK_PUBLISH_RETRY = True
CELERY_TASK_PUBLISH_RETRY_POLICY = {
    "max_retries": 5,
    "interval_start": 0,
    "interval_step": 1,
    "interval_max": 5,
}
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_CANCEL_LONG_RUNNING_TASKS_ON_CONNECTION_LOSS = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_SOFT_TIME_LIMIT = 90
CELERY_TASK_TIME_LIMIT = 120
CELERY_BROKER_POOL_LIMIT = 10
CELERY_BROKER_CONNECTION_RETRY = True
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = None
CELERY_RESULT_BACKEND_ALWAYS_RETRY = True
CELERY_RESULT_BACKEND_MAX_RETRIES = 3
CELERY_VISIBILITY_TIMEOUT = 3600
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "global_keyprefix": "forrent:broker:",
    "visibility_timeout": CELERY_VISIBILITY_TIMEOUT,
    "priority_steps": list(range(10)),
    "queue_order_strategy": "priority",
    "retry_on_timeout": True,
}
CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS = {
    "global_keyprefix": "forrent:result:",
    "visibility_timeout": CELERY_VISIBILITY_TIMEOUT,
}
CELERY_BEAT_SCHEDULE = {
    "celery-pipeline-heartbeat": {
        "task": "apps.common.tasks.record_celery_heartbeat",
        "schedule": 60.0,
        "options": {"expires": 50, "priority": 9},
    },
    "cleanup-expired-auth-records": {
        "task": "apps.accounts.tasks.cleanup_expired_auth_records",
        "schedule": crontab(hour=3, minute=15),
        "options": {"expires": 60 * 60, "priority": 2},
    },
    "dispatch-appointment-reminders": {
        "task": "apps.viewing_requests.tasks.dispatch_appointment_reminders",
        "schedule": crontab(hour=8, minute=0),
        "options": {"expires": 60 * 60, "priority": 5},
    },
}

FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:3000")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@forrent.io.vn")
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env("EMAIL_PORT")
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_HOST_PASSWORD_B64 = env("EMAIL_HOST_PASSWORD_B64", default="")
if EMAIL_HOST_PASSWORD_B64:
    EMAIL_HOST_PASSWORD = base64.b64decode(EMAIL_HOST_PASSWORD_B64).decode("utf-8")
EMAIL_USE_TLS = env("EMAIL_USE_TLS")
EMAIL_USE_SSL = env("EMAIL_USE_SSL")
EMAIL_TIMEOUT = env("EMAIL_TIMEOUT")
SENDIFY_API_KEY = env("SENDIFY_API_KEY", default="")
SENDIFY_API_URL = env("SENDIFY_API_URL", default="https://sendify.vn/api/emails")
SENDIFY_ACCOUNT_KEY = env("SENDIFY_ACCOUNT_KEY", default="")
SENDIFY_TEMPLATES_URL = env("SENDIFY_TEMPLATES_URL", default="https://sendify.vn/api/templates")
SENDIFY_API_TIMEOUT = env("SENDIFY_API_TIMEOUT")
OTP_REQUEST_COOLDOWN_SECONDS = env("OTP_REQUEST_COOLDOWN_SECONDS")
OTP_MAX_ATTEMPTS = env("OTP_MAX_ATTEMPTS")
OTP_ATTEMPT_WINDOW_SECONDS = env("OTP_ATTEMPT_WINDOW_SECONDS")
AUTH_TOKEN_RETENTION_DAYS = env("AUTH_TOKEN_RETENTION_DAYS")
APPOINTMENT_REMINDERS_ENABLED = env("APPOINTMENT_REMINDERS_ENABLED")

SENTRY_DSN = env("SENTRY_DSN", default="")
SENTRY_ENVIRONMENT = env("SENTRY_ENVIRONMENT", default="local")
SENTRY_TRACES_SAMPLE_RATE = env("SENTRY_TRACES_SAMPLE_RATE")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=SENTRY_ENVIRONMENT,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        send_default_pii=False,
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
    )

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_CACHE_URL,
        "KEY_PREFIX": "forrent",
        "TIMEOUT": 300,
        "OPTIONS": {
            "pool_class": "redis.BlockingConnectionPool",
            "max_connections": REDIS_MAX_CONNECTIONS,
            "timeout": REDIS_SOCKET_TIMEOUT,
            "socket_connect_timeout": REDIS_SOCKET_TIMEOUT,
            "socket_timeout": REDIS_SOCKET_TIMEOUT,
            "health_check_interval": 30,
        },
    },
    "sessions": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_SESSION_URL,
        "KEY_PREFIX": "forrent-session",
        "TIMEOUT": 60 * 60 * 24,
        "OPTIONS": {
            "pool_class": "redis.BlockingConnectionPool",
            "max_connections": REDIS_MAX_CONNECTIONS,
            "timeout": REDIS_SOCKET_TIMEOUT,
            "socket_connect_timeout": REDIS_SOCKET_TIMEOUT,
            "socket_timeout": REDIS_SOCKET_TIMEOUT,
            "health_check_interval": 30,
        },
    },
    "coordination": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_COORDINATION_URL,
        "KEY_PREFIX": "forrent-coordination",
        "TIMEOUT": 60 * 60,
        "OPTIONS": {
            "pool_class": "redis.BlockingConnectionPool",
            "max_connections": REDIS_MAX_CONNECTIONS,
            "timeout": REDIS_SOCKET_TIMEOUT,
            "socket_connect_timeout": REDIS_SOCKET_TIMEOUT,
            "socket_timeout": REDIS_SOCKET_TIMEOUT,
            "health_check_interval": 30,
        },
    },
}
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
SESSION_CACHE_ALIAS = "sessions"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(levelname)s %(asctime)s %(name)s %(message)s",
        },
        "json": {
            "()": "apps.common.logging.JsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
