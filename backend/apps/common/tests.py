from django.test import SimpleTestCase, override_settings

from apps.common.storage import SupabaseMediaStorage


def test_health_check(client):
    response = client.get("/api/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


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
