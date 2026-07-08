import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import serializers
from rest_framework.test import APIClient

from apps.common.image_validation import validate_uploaded_image_file
from apps.rooms.tests.factories import create_admin, create_room, create_user
from apps.locations.models import AreaRange
from apps.rooms.serializers import validate_room_image_url

User = get_user_model()


@pytest.mark.django_db
class TestRoomAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_public_room_api_does_not_return_internal_note_or_commission_data(self):
        room = create_room()

        response = self.client.get(f"/api/rooms/{room.slug}/")

        assert response.status_code == 200
        data = response.json()["data"]
        assert "internal_note" not in data
        assert "commission_percent" not in data
        assert "commission_base_amount" not in data
        assert "estimated_commission_amount" not in data
        assert data["deposit_type_name"] == "Cọc 1 tháng"
        assert data["deposit_amount"] == "5000000.00"
        assert data["electricity_price_per_kwh"] == "4000.00"
        assert data["water_price_per_person"] == "100000.00"
        assert data["service_fee"] == "150000.00"

    def test_public_room_list_hides_unavailable_rooms(self):
        available_room = create_room()
        unavailable_room = create_room(status="UNAVAILABLE")

        response = self.client.get("/api/rooms/")

        assert response.status_code == 200
        slugs = {room["slug"] for room in response.json()["data"]["results"]}
        assert available_room.slug in slugs
        assert unavailable_room.slug not in slugs

    def test_tenant_cannot_access_admin_api(self):
        tenant = create_user()
        self.client.force_authenticate(tenant)

        response = self.client.get("/api/admin/rooms/")

        assert response.status_code == 403

    def test_admin_can_access_admin_api(self):
        admin = create_admin()
        self.client.force_authenticate(admin)

        response = self.client.get("/api/admin/rooms/")

        assert response.status_code == 200

    def test_saler_admin_can_access_admin_operations(self):
        saler = create_user(email="saler@example.com", phone="0922222222", role=User.Role.SALER)
        self.client.force_authenticate(saler)

        allowed_urls = [
            "/api/admin/viewing-requests/",
            "/api/admin/contacts/",
            "/api/admin/rooms/",
            "/api/admin/blogs/",
            "/api/admin/cities/",
            "/api/admin/deposit-types/",
            "/api/admin/commissions/summary/",
            "/api/admin/dashboard/summary/",
        ]

        for url in allowed_urls:
            assert self.client.get(url).status_code == 200

    def test_admin_room_validation_rejects_area_outside_range_and_large_commission(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        small_range = AreaRange.objects.create(name="10-15m2", min_area="10", max_area="15")
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {
                "actual_area": "25",
                "area_range": small_range.id,
                "commission_percent": "150",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "actual_area" in response.data["errors"]
        assert "commission_percent" in response.data["errors"]

    def test_room_image_validation_rejects_svg_upload(self):
        image = SimpleUploadedFile("bad.svg", b"<svg></svg>", content_type="image/svg+xml")

        with pytest.raises(serializers.ValidationError):
            validate_uploaded_image_file(image, "uploaded_images")

    def test_room_image_url_rejects_unapproved_host(self):
        with pytest.raises(serializers.ValidationError):
            validate_room_image_url("https://untrusted.example/photo.jpg")
