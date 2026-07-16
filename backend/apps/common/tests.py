import json
from unittest import mock

import cloudinary.exceptions
import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.http import HttpResponse
from django.test import RequestFactory
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

from apps.common import email as sendify_email
from apps.common.audit import audit_event
from apps.common.email import SendifyEmailBackend
from apps.common.middleware import RequestIDMiddleware
from apps.common.storage import CloudinaryMediaStorage
from apps.rooms.tests.factories import create_admin, create_user


@pytest.mark.django_db
def test_health_check(client):
    response = client.get("/api/health/")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["checks"]["database"] is True
    assert payload["checks"]["cache"] is True
    assert payload["checks"]["media_storage"] is True


@pytest.mark.django_db
def test_audit_event_structured_log_includes_request_context():
    request = RequestFactory().post("/api/admin/test/", HTTP_X_FORWARDED_FOR="203.0.113.10")
    request.id = "request-123"

    with mock.patch("apps.common.audit.logger.info") as info:
        audit_event("admin.test", request=request, metadata={"password": "secret", "status": "ok"})

    payload = info.call_args.kwargs["extra"]
    assert payload["request_id"] == "request-123"
    assert payload["method"] == "POST"
    assert payload["path"] == "/api/admin/test/"
    assert payload["ip_address"] == "203.0.113.10"
    assert payload["metadata_fields"] == ["password", "status"]


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

    def test_exists_returns_false_for_cloudinary_not_found(self):
        storage = CloudinaryMediaStorage()

        with mock.patch("cloudinary.api.resource", side_effect=cloudinary.exceptions.NotFound("missing")):
            assert storage.exists("room-images/missing.jpg") is False
