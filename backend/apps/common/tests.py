import json
from types import SimpleNamespace
from unittest import mock

import cloudinary.exceptions
import pytest
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.cache import caches
from django.core.exceptions import ImproperlyConfigured
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.db import connections
from django.http import HttpResponse
from django.test import RequestFactory
from django.test import SimpleTestCase, override_settings
from django.utils.module_loading import import_string
from rest_framework.test import APIClient
from rest_framework.test import APIRequestFactory

from apps.common import email as sendify_email
from apps.common.audit import audit_event
from apps.common.cache_utils import execute_once, get_or_set_versioned, invalidate_cache_namespace
from apps.common.cache_utils import CoordinationServiceUnavailable
from apps.common.throttling import CoordinationScopedRateThrottle
from apps.common.email import SendifyEmailBackend
from apps.common.middleware import RequestIDMiddleware
from apps.common.storage import CloudinaryMediaStorage
from apps.rooms.tests.factories import create_admin, create_user


def test_versioned_cache_reuses_values_and_invalidates_without_scanning_keys():
    from django.core.cache import cache

    cache.clear()
    calls = []

    def producer():
        calls.append(True)
        return {"rooms": len(calls)}

    first, first_hit = get_or_set_versioned("test:rooms", "page=1", producer, timeout=60)
    second, second_hit = get_or_set_versioned("test:rooms", "page=1", producer, timeout=60)
    invalidate_cache_namespace("test:rooms")
    third, third_hit = get_or_set_versioned("test:rooms", "page=1", producer, timeout=60)

    assert first == second == {"rooms": 1}
    assert third == {"rooms": 2}
    assert (first_hit, second_hit, third_hit) == (False, True, False)


def test_execute_once_records_success_but_releases_failed_claims():
    from django.core.cache import cache

    cache.clear()
    calls = []

    def successful_operation():
        calls.append("success")
        return "sent"

    first_result, first_executed = execute_once("test:email:1", successful_operation, done_timeout=60)
    second_result, second_executed = execute_once("test:email:1", successful_operation, done_timeout=60)

    assert (first_result, first_executed) == ("sent", True)
    assert (second_result, second_executed) == (None, False)
    assert calls == ["success"]

    def failing_operation():
        raise RuntimeError("send failed")

    with pytest.raises(RuntimeError, match="send failed"):
        execute_once("test:email:2", failing_operation, done_timeout=60)

    recovered_result, recovered_executed = execute_once(
        "test:email:2",
        lambda: "recovered",
        done_timeout=60,
    )
    assert (recovered_result, recovered_executed) == ("recovered", True)


def test_cache_and_task_idempotency_fail_open_when_redis_is_unavailable():
    with mock.patch("apps.common.cache_utils.cache.get", side_effect=RuntimeError("redis unavailable")):
        cached_value, cache_hit = get_or_set_versioned(
            "test:outage",
            "page=1",
            lambda: {"source": "database"},
            timeout=60,
        )
    with mock.patch.object(caches["default"], "get", side_effect=RuntimeError("redis unavailable")):
        task_value, task_executed = execute_once(
            "test:outage-email",
            lambda: "sent without redis",
            done_timeout=60,
        )

    assert (cached_value, cache_hit) == ({"source": "database"}, False)
    assert (task_value, task_executed) == ("sent without redis", True)


def test_cache_invalidation_does_not_break_business_writes_during_redis_outage():
    coordination_cache = caches["coordination"]

    with (
        mock.patch.object(coordination_cache, "add", return_value=False),
        mock.patch.object(coordination_cache, "incr", side_effect=ValueError("missing version")),
        mock.patch.object(coordination_cache, "set", side_effect=RuntimeError("redis unavailable")),
    ):
        assert invalidate_cache_namespace("test:outage-invalidation") == 0


def test_execute_once_delivers_when_redis_fails_after_lock_acquisition():
    cache_backend = caches["default"]

    with (
        mock.patch.object(
            cache_backend,
            "get",
            side_effect=[False, RuntimeError("redis unavailable"), RuntimeError("redis unavailable")],
        ),
        mock.patch.object(cache_backend, "add", return_value=True),
    ):
        result, executed = execute_once(
            "test:mid-operation-outage",
            lambda: "sent despite outage",
            done_timeout=60,
        )

    assert (result, executed) == ("sent despite outage", True)


def test_redis_roles_and_cached_database_sessions_are_isolated():
    assert settings.SESSION_ENGINE == "django.contrib.sessions.backends.cached_db"
    assert settings.SESSION_CACHE_ALIAS == "sessions"
    assert set(settings.CACHES) >= {"default", "sessions", "coordination"}
    assert settings.CACHES["default"]["LOCATION"] != settings.CACHES["sessions"]["LOCATION"]
    assert settings.CACHES["sessions"]["LOCATION"] != settings.CACHES["coordination"]["LOCATION"]
    assert settings.CELERY_BROKER_URL != settings.CELERY_RESULT_BACKEND
    assert settings.CELERY_RESULT_EXPIRES == 3600
    assert settings.CELERY_TASK_ACKS_LATE is True
    assert settings.CELERY_WORKER_PREFETCH_MULTIPLIER == 1
    throttle_class = import_string(settings.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"][0])
    assert throttle_class.cache is caches["coordination"]


def test_celery_queues_routes_and_worker_safety_are_explicit():
    queue_names = {queue.name for queue in settings.CELERY_TASK_QUEUES}

    assert queue_names == {"critical", "notifications", "maintenance", "default"}
    assert settings.CELERY_TASK_CREATE_MISSING_QUEUES is False
    assert settings.CELERY_TASK_ROUTES["apps.accounts.tasks.send_otp_email"] == {
        "queue": "critical",
        "priority": 9,
    }
    assert settings.CELERY_TASK_ROUTES["apps.viewing_requests.tasks.send_appointment_reminder_email"] == {
        "queue": "notifications",
        "priority": 7,
    }
    assert settings.CELERY_TASK_SERIALIZER == "json"
    assert settings.CELERY_RESULT_SERIALIZER == "json"
    assert settings.CELERY_ACCEPT_CONTENT == ["json"]
    assert settings.CELERY_TASK_PUBLISH_RETRY is True
    assert settings.CELERY_TASK_DEFAULT_DELIVERY_MODE == 2
    assert settings.CELERY_BROKER_CONNECTION_RETRY is True
    assert settings.CELERY_BROKER_CONNECTION_MAX_RETRIES is None
    assert settings.CELERY_VISIBILITY_TIMEOUT == 3600
    assert settings.CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS["visibility_timeout"] == 3600
    assert settings.CELERY_WORKER_MAX_TASKS_PER_CHILD == 200
    assert settings.CELERY_WORKER_MAX_MEMORY_PER_CHILD == 256_000
    assert settings.CELERY_WORKER_CANCEL_LONG_RUNNING_TASKS_ON_CONNECTION_LOSS is True
    assert settings.CELERY_TASK_SOFT_TIME_LIMIT < settings.CELERY_TASK_TIME_LIMIT
    assert {
        "celery-pipeline-heartbeat",
        "cleanup-expired-auth-records",
        "dispatch-appointment-reminders",
    } <= set(settings.CELERY_BEAT_SCHEDULE)


def test_enqueue_task_on_commit_propagates_request_id_and_redacts_sensitive_args():
    from apps.common.request_context import request_id_context
    from apps.common.tasking import enqueue_task_on_commit

    task = mock.Mock()
    token = request_id_context.set("request-123")
    try:
        with mock.patch("apps.common.tasking.transaction.on_commit", side_effect=lambda callback: callback()):
            enqueue_task_on_commit(
                task,
                "tenant@example.com",
                "123456",
                redact_args=True,
                priority=9,
            )
    finally:
        request_id_context.reset(token)

    task.apply_async.assert_called_once_with(
        args=("tenant@example.com", "123456"),
        headers={"request_id": "request-123"},
        argsrepr="(<redacted>)",
        priority=9,
    )


def test_request_id_is_available_during_request_and_cleared_after_response():
    from apps.common.request_context import request_id_context

    observed = []
    request = RequestFactory().get("/api/test/", HTTP_X_REQUEST_ID="request-456")
    middleware = RequestIDMiddleware(
        lambda _request: observed.append(request_id_context.get()) or HttpResponse(status=200)
    )

    response = middleware(request)

    assert response["X-Request-ID"] == "request-456"
    assert observed == ["request-456"]
    assert request_id_context.get() == ""


def test_reliable_email_tasks_retry_only_transient_failures_and_do_not_store_results():
    from django.db import OperationalError
    from kombu.exceptions import OperationalError as KombuOperationalError

    from apps.common.email import SendifyEmailTransientError
    from apps.common.tasking import ReliableEmailTask, ReliableMaintenanceTask

    assert set(ReliableEmailTask.autoretry_for) == {OSError, OperationalError, SendifyEmailTransientError}
    assert ReliableEmailTask.ignore_result is True
    assert ReliableEmailTask.acks_late is True
    assert ReliableEmailTask.reject_on_worker_lost is True
    assert ReliableEmailTask.soft_time_limit < ReliableEmailTask.time_limit
    assert set(ReliableMaintenanceTask.autoretry_for) == {OSError, OperationalError, KombuOperationalError}
    assert ReliableMaintenanceTask.ignore_result is False


def test_celery_lifecycle_logging_is_structured_and_does_not_record_task_arguments():
    from apps.common import celery_signals

    task = SimpleNamespace(
        name="apps.accounts.tasks.send_otp_email",
        request=SimpleNamespace(
            headers={"request_id": "request-789"},
            root_id="root-1",
            parent_id="parent-1",
            retries=1,
            delivery_info={"routing_key": "critical"},
        ),
    )

    with mock.patch.object(celery_signals.logger, "info") as info:
        celery_signals.task_started(task_id="task-1", task=task)
        celery_signals.task_finished(task_id="task-1", task=task, state="SUCCESS")

    started = info.call_args_list[0].kwargs["extra"]
    finished = info.call_args_list[1].kwargs["extra"]
    assert started["request_id"] == "request-789"
    assert started["task_id"] == "task-1"
    assert started["task_name"] == task.name
    assert started["queue"] == "critical"
    assert finished["task_state"] == "SUCCESS"
    assert finished["duration_ms"] >= 0
    assert "args" not in started and "kwargs" not in started


def test_coordination_throttle_returns_service_unavailable_when_redis_fails():
    request = APIRequestFactory().post("/api/auth/login/")
    request.user = AnonymousUser()
    view = SimpleNamespace(throttle_scope="login")
    throttle = CoordinationScopedRateThrottle()

    with mock.patch.object(caches["coordination"], "get", side_effect=RuntimeError("redis unavailable")):
        with pytest.raises(CoordinationServiceUnavailable):
            throttle.allow_request(request, view)


@pytest.mark.django_db
def test_health_check(client):
    response = client.get("/api/health/")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["checks"]["database"] is True
    assert payload["checks"]["cache"] is True
    assert payload["checks"]["session_cache"] is True
    assert payload["checks"]["coordination_cache"] is True
    assert payload["checks"]["media_storage"] is True


@pytest.mark.django_db
def test_health_check_reports_database_failure_without_exposing_details(client):
    connection = connections["default"]

    with mock.patch.object(connection, "cursor", side_effect=RuntimeError("database secret")):
        with mock.patch("config.urls.logger.exception") as exception:
            response = client.get("/api/health/")

    assert response.status_code == 503
    assert response.json() == {
        "status": "error",
        "checks": {
            "database": False,
            "cache": True,
            "session_cache": True,
            "coordination_cache": True,
            "media_storage": True,
        },
    }
    assert b"database secret" not in response.content
    exception.assert_called_once_with("Database health check failed")


def test_celery_pipeline_health_requires_a_recent_worker_heartbeat(client):
    from apps.common.tasks import record_celery_heartbeat

    unavailable = client.get("/api/health/celery/")
    record_celery_heartbeat()
    healthy = client.get("/api/health/celery/")

    assert unavailable.status_code == 503
    assert unavailable.json() == {"status": "error", "checks": {"celery_pipeline": False}}
    assert healthy.status_code == 200
    assert healthy.json() == {"status": "ok", "checks": {"celery_pipeline": True}}


@pytest.mark.django_db
def test_audit_event_structured_log_includes_request_context():
    request = RequestFactory().post(
        "/api/admin/test/",
        HTTP_X_FORWARDED_FOR="198.51.100.99",
        HTTP_X_REAL_IP="203.0.113.10",
    )
    request.id = "request-123"

    with mock.patch("apps.common.audit.logger.info") as info:
        audit_event("admin.test", request=request, metadata={"password": "secret", "status": "ok"})

    payload = info.call_args.kwargs["extra"]
    assert payload["request_id"] == "request-123"
    assert payload["method"] == "POST"
    assert payload["path"] == "/api/admin/test/"
    assert payload["ip_address"] == "203.0.113.10"
    assert payload["metadata_fields"] == ["password", "status"]


@pytest.mark.django_db
@override_settings(AUDIT_LOG_FAIL_CLOSED=True)
def test_audit_event_fails_closed_when_persistence_fails():
    with mock.patch("apps.common.audit.AuditLog.objects.create", side_effect=RuntimeError("database unavailable")):
        with pytest.raises(RuntimeError, match="database unavailable"):
            audit_event("admin.test")


class RequestIDMiddlewareTests(SimpleTestCase):
    def test_logs_request_duration_and_status_class(self):
        request = RequestFactory().get("/api/test/")
        middleware = RequestIDMiddleware(lambda _request: HttpResponse(status=503))

        with mock.patch("apps.common.middleware.request_logger.warning") as warning:
            response = middleware(request)

        assert response["X-Request-ID"]
        payload = warning.call_args.kwargs["extra"]
        assert payload["status_code"] == 503
        assert payload["status_class"] == "5xx"
        assert payload["duration_ms"] >= 0

    def test_logs_exception_before_reraising(self):
        request = RequestFactory().get("/api/test/")

        def failing_view(_request):
            raise RuntimeError("boom")

        middleware = RequestIDMiddleware(failing_view)

        with mock.patch("apps.common.middleware.request_logger.exception") as exception:
            with pytest.raises(RuntimeError):
                middleware(request)

        payload = exception.call_args.kwargs["extra"]
        assert payload["path"] == "/api/test/"
        assert payload["duration_ms"] >= 0


@override_settings(
    SENDIFY_API_KEY="sfy_test_key",
    SENDIFY_API_URL="https://sendify.example/api/emails",
    SENDIFY_API_TIMEOUT=9,
)
class SendifyEmailBackendTests(SimpleTestCase):
    def test_sends_django_email_through_sendify_api(self):
        response = mock.MagicMock()
        response.status = 202
        response.__enter__.return_value = response

        with mock.patch("apps.common.email.urlopen", return_value=response) as urlopen:
            sent = SendifyEmailBackend().send_messages(
                [
                    EmailMessage(
                        subject="Ma OTP ForRent",
                        body="Ma xac thuc: <123456>\nHet han sau 10 phut.",
                        from_email="no-reply@forrent.io.vn",
                        to=["tenant@example.com", "backup@example.com"],
                    )
                ]
            )

        assert sent == 1
        request = urlopen.call_args.args[0]
        assert request.full_url == "https://sendify.example/api/emails"
        assert request.get_header("Authorization") == "Bearer sfy_test_key"
        assert json.loads(request.data) == {
            "from": "no-reply@forrent.io.vn",
            "to": ["tenant@example.com", "backup@example.com"],
            "subject": "Ma OTP ForRent",
            "html": "<p>Ma xac thuc: &lt;123456&gt;<br>Het han sau 10 phut.</p>",
        }
        urlopen.assert_called_once()
        assert urlopen.call_args.kwargs["timeout"] == 9

    def test_classifies_retryable_and_permanent_sendify_responses(self):
        retryable_response = mock.MagicMock()
        retryable_response.status = 503
        retryable_response.__enter__.return_value = retryable_response
        permanent_response = mock.MagicMock()
        permanent_response.status = 400
        permanent_response.__enter__.return_value = permanent_response
        message = EmailMessage(
            subject="Test",
            body="Test",
            from_email="no-reply@forrent.io.vn",
            to=["tenant@example.com"],
        )

        with mock.patch("apps.common.email.urlopen", return_value=retryable_response):
            with pytest.raises(sendify_email.SendifyEmailTransientError):
                SendifyEmailBackend().send_messages([message])
        with mock.patch("apps.common.email.urlopen", return_value=permanent_response):
            with pytest.raises(sendify_email.SendifyEmailError) as exc_info:
                SendifyEmailBackend().send_messages([message])

        assert not isinstance(exc_info.value, sendify_email.SendifyEmailTransientError)


@override_settings(
    SENDIFY_ACCOUNT_KEY="sfy_account_test_key",
    SENDIFY_TEMPLATES_URL="https://sendify.example/api/templates",
    SENDIFY_API_TIMEOUT=9,
)
class SendifyTemplateClientTests(SimpleTestCase):
    @override_settings(SENDIFY_ACCOUNT_KEY="")
    def test_requires_account_key(self):
        with mock.patch("apps.common.email.urlopen") as urlopen:
            with pytest.raises(ImproperlyConfigured, match="SENDIFY_ACCOUNT_KEY"):
                sendify_email.fetch_sendify_templates()

        urlopen.assert_not_called()

    def test_fetches_shared_and_personal_templates_with_account_key(self):
        response = mock.MagicMock()
        response.status = 200
        response.read.return_value = json.dumps(
            {
                "shared": [{"id": "shared-1", "name": "OTP mac dinh"}],
                "personal": [{"id": "personal-1", "name": "OTP ForRent"}],
            }
        ).encode("utf-8")
        response.__enter__.return_value = response

        with mock.patch("apps.common.email.urlopen", return_value=response) as urlopen:
            templates = sendify_email.fetch_sendify_templates()

        assert templates == {
            "shared": [{"id": "shared-1", "name": "OTP mac dinh"}],
            "personal": [{"id": "personal-1", "name": "OTP ForRent"}],
        }
        request = urlopen.call_args.args[0]
        assert request.full_url == "https://sendify.example/api/templates"
        assert request.get_method() == "GET"
        assert request.get_header("Authorization") == "Bearer sfy_account_test_key"
        assert request.get_header("Accept") == "application/json"
        assert urlopen.call_args.kwargs["timeout"] == 9

    def test_rejects_invalid_template_response_shape(self):
        response = mock.MagicMock()
        response.status = 200
        response.read.return_value = b'{"shared": {}, "personal": []}'
        response.__enter__.return_value = response

        with mock.patch("apps.common.email.urlopen", return_value=response):
            with pytest.raises(sendify_email.SendifyEmailError):
                sendify_email.fetch_sendify_templates()


@pytest.mark.django_db
class TestSendifyTemplateAPI:
    @override_settings(
        SENDIFY_ACCOUNT_KEY="sfy_account_test_key",
        SENDIFY_TEMPLATES_URL="https://sendify.example/api/templates",
        SENDIFY_API_TIMEOUT=9,
    )
    def test_admin_can_list_sendify_templates(self):
        client = APIClient()
        client.force_authenticate(create_admin())
        response_from_sendify = mock.MagicMock()
        response_from_sendify.status = 200
        response_from_sendify.read.return_value = b'{"shared": [], "personal": [{"id": "otp"}]}'
        response_from_sendify.__enter__.return_value = response_from_sendify

        with mock.patch("apps.common.email.urlopen", return_value=response_from_sendify):
            response = client.get("/api/admin/sendify/templates/")

        assert response.status_code == 200
        assert response.data["data"] == {"shared": [], "personal": [{"id": "otp"}]}

    def test_tenant_cannot_list_sendify_templates(self):
        client = APIClient()
        client.force_authenticate(create_user())

        with mock.patch("apps.common.email.urlopen") as urlopen:
            response = client.get("/api/admin/sendify/templates/")

        assert response.status_code == 403
        urlopen.assert_not_called()


@override_settings(
    CLOUDINARY_CLOUD_NAME="demo",
    CLOUDINARY_API_KEY="key",
    CLOUDINARY_API_SECRET="secret",
    CLOUDINARY_UPLOAD_MODERATION="",
)
class CloudinaryMediaStorageTests(SimpleTestCase):
    def test_public_url_uses_secure_cloudinary_url(self):
        storage = CloudinaryMediaStorage()

        assert storage.url("room-images/photo.jpg") == (
            "https://res.cloudinary.com/demo/image/upload/v1/room-images/photo"
        )

    def test_available_name_replaces_user_filename_with_random_id(self):
        storage = CloudinaryMediaStorage()

        name = storage.get_available_name("room-images/photo.jpg")

        assert name.startswith("room-images/")
        assert "photo" not in name
        assert len(name.removeprefix("room-images/").removesuffix(".jpg")) == 32
        assert name.endswith(".jpg")

    def test_save_uploads_with_public_id_and_keeps_django_name(self):
        storage = CloudinaryMediaStorage()

        with mock.patch("cloudinary.uploader.upload") as upload:
            saved_name = storage._save("room-images/photo.jpg", ContentFile(b"image"))

        assert saved_name == "room-images/photo.jpg"
        upload.assert_called_once()
        assert upload.call_args.kwargs["public_id"] == "room-images/photo"
        assert upload.call_args.kwargs["resource_type"] == "image"
        assert upload.call_args.kwargs["overwrite"] is False
        assert upload.call_args.kwargs["eager"][0]["width"] == 640

    def test_video_uses_cloudinary_video_resource_type(self):
        storage = CloudinaryMediaStorage()

        with mock.patch("cloudinary.uploader.upload") as upload:
            saved_name = storage._save("room-videos/tour.mp4", ContentFile(b"video"))

        assert saved_name == "room-videos/tour.mp4"
        assert upload.call_args.kwargs["public_id"] == "room-videos/tour"
        assert upload.call_args.kwargs["resource_type"] == "video"
        assert "eager" not in upload.call_args.kwargs
        assert storage.url("room-videos/tour.mp4") == (
            "https://res.cloudinary.com/demo/video/upload/v1/room-videos/tour.mp4"
        )

    @override_settings(CLOUDINARY_UPLOAD_MODERATION="manual")
    def test_save_passes_cloudinary_moderation_when_configured(self):
        storage = CloudinaryMediaStorage()

        with mock.patch("cloudinary.uploader.upload") as upload:
            storage._save("room-images/photo.jpg", ContentFile(b"image"))

        assert upload.call_args.kwargs["moderation"] == "manual"

    @override_settings(CLOUDINARY_UPLOAD_MODERATION="manual")
    def test_video_upload_also_passes_cloudinary_moderation(self):
        storage = CloudinaryMediaStorage()

        with mock.patch("cloudinary.uploader.upload") as upload:
            storage._save("room-videos/tour.mp4", ContentFile(b"video"))

        assert upload.call_args.kwargs["moderation"] == "manual"

    def test_exists_returns_false_for_cloudinary_not_found(self):
        storage = CloudinaryMediaStorage()

        with mock.patch("cloudinary.api.resource", side_effect=cloudinary.exceptions.NotFound("missing")):
            assert storage.exists("room-images/missing.jpg") is False
