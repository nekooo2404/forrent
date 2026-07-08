from unittest import mock

import cloudinary.exceptions
import pytest
from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings

from apps.common.storage import CloudinaryMediaStorage, SupabaseMediaStorage


@pytest.mark.django_db
def test_health_check(client):
    response = client.get("/api/health/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["checks"]["database"] is True
    assert payload["checks"]["cache"] is True
    assert payload["checks"]["media_storage"] is True


@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_SECRET_KEY="secret",
    SUPABASE_STORAGE_BUCKET="forrent-media",
    SUPABASE_STORAGE_TIMEOUT=10,
)
class SupabaseMediaStorageTests(SimpleTestCase):
    def test_public_url_uses_bucket_and_quotes_path(self):
        storage = SupabaseMediaStorage()

        assert storage.url("room images/a b.jpg") == (
            "https://example.supabase.co/storage/v1/object/public/forrent-media/room%20images/a%20b.jpg"
        )

    def test_available_name_adds_suffix_without_head_request(self):
        storage = SupabaseMediaStorage()

        name = storage.get_available_name("room-images/photo.jpg")

        assert name.startswith("room-images/photo_")
        assert name.endswith(".jpg")


@override_settings(
    CLOUDINARY_CLOUD_NAME="demo",
    CLOUDINARY_API_KEY="key",
    CLOUDINARY_API_SECRET="secret",
)
class CloudinaryMediaStorageTests(SimpleTestCase):
    def test_public_url_uses_secure_cloudinary_url(self):
        storage = CloudinaryMediaStorage()

        assert storage.url("room-images/photo.jpg") == (
            "https://res.cloudinary.com/demo/image/upload/v1/room-images/photo"
        )

    def test_available_name_adds_suffix_without_api_request(self):
        storage = CloudinaryMediaStorage()

        name = storage.get_available_name("room-images/photo.jpg")

        assert name.startswith("room-images/photo_")
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

    def test_exists_returns_false_for_cloudinary_not_found(self):
        storage = CloudinaryMediaStorage()

        with mock.patch("cloudinary.api.resource", side_effect=cloudinary.exceptions.NotFound("missing")):
            assert storage.exists("room-images/missing.jpg") is False
