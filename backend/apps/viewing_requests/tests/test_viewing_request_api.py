from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.rooms.tests.factories import create_admin, create_room, create_user
from apps.viewing_requests.models import ViewingRequest


@pytest.mark.django_db
class TestViewingRequestAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_create_viewing_request_successfully(self):
        tenant = create_user()
        room = create_room()
        self.client.force_authenticate(tenant)

        response = self.client.post(
            "/api/viewing-requests/",
            {
                "room_id": room.id,
                "preferred_viewing_date": "2026-07-01",
                "preferred_viewing_time_slot": ViewingRequest.TimeSlot.MORNING,
            },
            format="json",
        )

        assert response.status_code == 201
        assert response.data["data"]["room_id"] == room.id
        assert response.data["data"]["status"] == ViewingRequest.Status.NEW
        assert response.data["data"]["preferred_viewing_date"] == "2026-07-01"
        assert response.data["data"]["preferred_viewing_time_slot"] == ViewingRequest.TimeSlot.MORNING
        lead = ViewingRequest.objects.get(id=response.data["data"]["id"])
        assert lead.full_name == tenant.full_name
        assert lead.phone == tenant.phone
        assert lead.email == tenant.email
        assert lead.preferred_viewing_date.isoformat() == "2026-07-01"
        assert lead.preferred_viewing_time_slot == ViewingRequest.TimeSlot.MORNING
        assert lead.estimated_commission_amount == Decimal("2500000.00")

    def test_duplicate_active_viewing_request_is_rejected(self):
        tenant = create_user()
        room = create_room()
        self.client.force_authenticate(tenant)
        self.client.post("/api/viewing-requests/", {"room_id": room.id}, format="json")

        response = self.client.post("/api/viewing-requests/", {"room_id": room.id}, format="json")

        assert response.status_code == 400
        assert response.data["success"] is False
        assert "room_id" in response.data["errors"]

    def test_confirm_moved_in_calculates_commission(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")

        assert response.status_code == 200
        lead.refresh_from_db()
        assert lead.status == ViewingRequest.Status.MOVED_IN
        assert lead.is_commission_counted is True
        assert lead.actual_commission_amount == Decimal("2500000.00")

    def test_confirm_moved_in_cannot_run_twice(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)
        self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")

        response = self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")

        assert response.status_code == 400
        assert response.data["success"] is False
        assert "status" in response.data["errors"]
