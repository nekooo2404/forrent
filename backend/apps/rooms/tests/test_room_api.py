import pytest
from rest_framework.test import APIClient

from apps.rooms.tests.factories import create_admin, create_room, create_user


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
