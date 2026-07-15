import base64
import importlib.util
from datetime import timedelta
from pathlib import Path

import environ

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
    SENTRY_TRACES_SAMPLE_RATE=(float, 0.0),
    EXPOSE_API_DOCS=(bool, False),
)

env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="unsafe-local-development-key-for-rental-backend-please-change")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")
EXPOSE_API_DOCS = env("EXPOSE_API_DOCS", default=DEBUG)

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
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "logout": "30/min",
        "register": "5/min",
        "password_reset": "5/min",
        "viewing_request": "5/min",
        "contact": "5/min",
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
        "UserRoleEnum": [("TENANT", "Tenant"), ("SALER", "Saler/Admin")],
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

REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = env("CELERY_TASK_ALWAYS_EAGER")
CELERY_TASK_EAGER_PROPAGATES = env(
    "CELERY_TASK_EAGER_PROPAGATES",
    default=CELERY_TASK_ALWAYS_EAGER,
)

FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:3000")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@forrent.io.vn")
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
SENDIFY_API_TIMEOUT = env("SENDIFY_API_TIMEOUT")

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
        "LOCATION": REDIS_URL,
    }
}

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
