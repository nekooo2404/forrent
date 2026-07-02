from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.rooms.models import Room
from apps.rooms.tests.factories import create_admin, create_room, create_user
from apps.viewing_requests.models import RoomLease, ViewingRequest, ViewingRequestActivity


@pytest.mark.django_db
class TestViewingRequestAPI:
    def setup_method(self):
        cache.clear()
        self.client = APIClient()

    def viewing_payload(self, room):
        return {
            "room_id": room.id,
            "preferred_viewing_date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "preferred_viewing_time_slot": ViewingRequest.TimeSlot.MORNING,
        }

    def test_create_viewing_request_successfully(self):
        tenant = create_user()
        room = create_room()
        self.client.force_authenticate(tenant)

        response = self.client.post(
            "/api/viewing-requests/",
            self.viewing_payload(room),
            format="json",
        )

        assert response.status_code == 201
        assert response.data["data"]["room_id"] == room.id
        assert response.data["data"]["status"] == ViewingRequest.Status.NEW
        assert response.data["data"]["preferred_viewing_date"] == self.viewing_payload(room)["preferred_viewing_date"]
        assert response.data["data"]["preferred_viewing_time_slot"] == ViewingRequest.TimeSlot.MORNING
        lead = ViewingRequest.objects.get(id=response.data["data"]["id"])
        assert lead.full_name == tenant.full_name
        assert lead.phone == tenant.phone
        assert lead.email == tenant.email
        assert lead.preferred_viewing_date.isoformat() == self.viewing_payload(room)["preferred_viewing_date"]
        assert lead.preferred_viewing_time_slot == ViewingRequest.TimeSlot.MORNING
        assert lead.confirmed_at is None
        assert lead.estimated_commission_amount == Decimal("2500000.00")

    def test_duplicate_active_viewing_request_is_rejected(self):
        tenant = create_user()
        room = create_room()
        self.client.force_authenticate(tenant)
        self.client.post("/api/viewing-requests/", self.viewing_payload(room), format="json")

        response = self.client.post("/api/viewing-requests/", self.viewing_payload(room), format="json")

        assert response.status_code == 400
        assert response.data["success"] is False
        assert "room_id" in response.data["errors"]

    def test_duplicate_active_viewing_request_is_rejected_by_contact_identity(self):
        first_tenant = create_user()
        second_tenant = create_user(email="second@example.com", phone="0933333333")
        room = create_room()
        ViewingRequest.objects.create(
            user=first_tenant,
            room=room,
            full_name=second_tenant.full_name,
            phone=second_tenant.phone,
            email=second_tenant.email,
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(second_tenant)

        response = self.client.post("/api/viewing-requests/", self.viewing_payload(room), format="json")

        assert response.status_code == 400
        assert "room_id" in response.data["errors"]

    def test_create_viewing_request_requires_schedule(self):
        tenant = create_user()
        room = create_room()
        self.client.force_authenticate(tenant)

        response = self.client.post("/api/viewing-requests/", {"room_id": room.id}, format="json")

        assert response.status_code == 400
        assert "preferred_viewing_date" in response.data["errors"]
        assert "preferred_viewing_time_slot" in response.data["errors"]

    def test_create_viewing_request_rejects_past_date(self):
        tenant = create_user()
        room = create_room()
        self.client.force_authenticate(tenant)

        response = self.client.post(
            "/api/viewing-requests/",
            {
                "room_id": room.id,
                "preferred_viewing_date": "2000-01-01",
                "preferred_viewing_time_slot": ViewingRequest.TimeSlot.MORNING,
            },
            format="json",
        )

        assert response.status_code == 400
        assert "preferred_viewing_date" in response.data["errors"]

    def test_create_viewing_request_rejects_unavailable_room(self):
        tenant = create_user()
        room = create_room(status=Room.Status.UNAVAILABLE)
        self.client.force_authenticate(tenant)

        response = self.client.post(
            "/api/viewing-requests/",
            self.viewing_payload(room),
            format="json",
        )

        assert response.status_code == 400
        assert "room_id" in response.data["errors"]

    def test_admin_patch_cannot_set_moved_in_status_directly(self):
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

        response = self.client.patch(
            f"/api/admin/viewing-requests/{lead.id}/",
            {"status": ViewingRequest.Status.MOVED_IN},
            format="json",
        )

        assert response.status_code == 400
        lead.refresh_from_db()
        assert lead.status == ViewingRequest.Status.NEW
        assert lead.is_commission_counted is False
        assert lead.actual_commission_amount == Decimal("0.00")

    def test_admin_patch_contacted_does_not_confirm_appointment(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/viewing-requests/{lead.id}/",
            {"status": ViewingRequest.Status.CONTACTED},
            format="json",
        )

        assert response.status_code == 200
        lead.refresh_from_db()
        assert lead.confirmed_at is None
        assert response.data["data"]["appointment_confirmed_at"] is None

    def test_admin_confirm_appointment_action_records_actual_schedule(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            preferred_viewing_date=timezone.localdate() + timedelta(days=1),
            preferred_viewing_time_slot=ViewingRequest.TimeSlot.MORNING,
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(
            f"/api/admin/viewing-requests/{lead.id}/confirm-appointment/",
            {
                "appointment_date": (timezone.localdate() + timedelta(days=2)).isoformat(),
                "appointment_time_slot": ViewingRequest.TimeSlot.AFTERNOON,
                "note": "Khach da xac nhan lich xem.",
            },
            format="json",
        )

        assert response.status_code == 200
        lead.refresh_from_db()
        assert lead.confirmed_at is not None
        assert lead.appointment_date.isoformat() == (timezone.localdate() + timedelta(days=2)).isoformat()
        assert lead.appointment_time_slot == ViewingRequest.TimeSlot.AFTERNOON
        assert lead.status == ViewingRequest.Status.CONTACTED
        assert ViewingRequestActivity.objects.filter(viewing_request=lead, action="CONFIRM_APPOINTMENT").exists()

    def test_admin_can_assign_lead_and_set_follow_up(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)
        follow_up = timezone.now() + timedelta(days=1)

        response = self.client.patch(
            f"/api/admin/viewing-requests/{lead.id}/",
            {
                "assigned_to": admin.id,
                "next_follow_up_at": follow_up.isoformat(),
                "saler_note": "Goi lai sau gio hanh chinh.",
            },
            format="json",
        )

        assert response.status_code == 200
        lead.refresh_from_db()
        assert lead.assigned_to == admin
        assert lead.next_follow_up_at is not None
        assert ViewingRequestActivity.objects.filter(viewing_request=lead, action="UPDATE").exists()

    def test_admin_bulk_update_leads_is_atomic(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        leads = [
            ViewingRequest.objects.create(
                user=tenant,
                room=room,
                full_name=tenant.full_name,
                phone=f"09123456{index:02d}",
                email=f"tenant-{index}@example.com",
                estimated_commission_amount=room.estimated_commission_amount,
            )
            for index in range(2)
        ]
        self.client.force_authenticate(admin)

        response = self.client.post(
            "/api/admin/viewing-requests/bulk-update/",
            {"ids": [lead.id for lead in leads], "status": ViewingRequest.Status.CONTACTED},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["data"]["updated_count"] == 2
        assert set(ViewingRequest.objects.filter(id__in=[lead.id for lead in leads]).values_list("status", flat=True)) == {
            ViewingRequest.Status.CONTACTED
        }

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
        room.refresh_from_db()
        assert lead.status == ViewingRequest.Status.MOVED_IN
        assert lead.is_commission_counted is True
        assert lead.actual_commission_amount == Decimal("2500000.00")
        assert room.status == Room.Status.UNAVAILABLE
        assert RoomLease.objects.filter(viewing_request=lead, status=RoomLease.Status.ACTIVE).exists()

    def test_admin_move_out_ends_active_lease_and_reopens_room(self):
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

        response = self.client.post(f"/api/admin/viewing-requests/{lead.id}/move-out/", {"note": "Khach tra phong."}, format="json")

        assert response.status_code == 200
        room.refresh_from_db()
        lease = RoomLease.objects.get(viewing_request=lead)
        assert room.status == Room.Status.AVAILABLE
        assert lease.status == RoomLease.Status.ENDED
        assert lease.move_out_at is not None

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
