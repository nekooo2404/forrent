from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.rooms.tests.factories import create_room, create_user
from apps.viewing_requests.models import ViewingRequest, ViewingRequestActivity


pytestmark = pytest.mark.django_db


def create_lead(*, room, tenant, status=ViewingRequest.Status.NEW):
    return ViewingRequest.objects.create(
        user=tenant,
        room=room,
        full_name=tenant.full_name,
        phone=tenant.phone,
        email=tenant.email,
        preferred_viewing_date=timezone.localdate() + timedelta(days=1),
        preferred_viewing_time_slot=ViewingRequest.TimeSlot.MORNING,
        status=status,
    )


class TestLandlordViewingRequestAPI:
    def setup_method(self):
        self.client = APIClient()
        self.landlord = create_user(
            email="lead-owner@example.com",
            phone="0917000001",
            role=User.Role.LANDLORD,
        )
        self.other_landlord = create_user(
            email="lead-other-owner@example.com",
            phone="0917000002",
            role=User.Role.LANDLORD,
        )
        self.tenant = create_user(email="lead-tenant@example.com", phone="0917000003")
        self.other_tenant = create_user(email="lead-other-tenant@example.com", phone="0917000004")
        self.own_lead = create_lead(room=create_room(created_by=self.landlord), tenant=self.tenant)
        self.foreign_lead = create_lead(room=create_room(created_by=self.other_landlord), tenant=self.other_tenant)

    def test_landlord_only_sees_requests_for_owned_rooms(self):
        self.client.force_authenticate(self.landlord)

        response = self.client.get("/api/landlord/viewing-requests/")

        assert response.status_code == 200
        assert [item["id"] for item in response.data["data"]["results"]] == [self.own_lead.id]
        assert response.data["data"]["results"][0]["room_code"] == self.own_lead.room.room_code

    def test_landlord_cannot_retrieve_or_update_foreign_request(self):
        self.client.force_authenticate(self.landlord)

        retrieve = self.client.get(f"/api/landlord/viewing-requests/{self.foreign_lead.id}/")
        update = self.client.patch(
            f"/api/landlord/viewing-requests/{self.foreign_lead.id}/",
            {"status": ViewingRequest.Status.CONTACTED},
            format="json",
        )
        schedule = self.client.post(
            f"/api/landlord/viewing-requests/{self.foreign_lead.id}/confirm-appointment/",
            {
                "appointment_date": (timezone.localdate() + timedelta(days=2)).isoformat(),
                "appointment_time_slot": ViewingRequest.TimeSlot.AFTERNOON,
            },
            format="json",
        )

        assert retrieve.status_code == 404
        assert update.status_code == 404
        assert schedule.status_code == 404
        self.foreign_lead.refresh_from_db()
        assert self.foreign_lead.status == ViewingRequest.Status.NEW

    def test_landlord_can_contact_and_schedule_own_request(self, django_capture_on_commit_callbacks):
        self.client.force_authenticate(self.landlord)

        contacted = self.client.patch(
            f"/api/landlord/viewing-requests/{self.own_lead.id}/",
            {"status": ViewingRequest.Status.CONTACTED},
            format="json",
        )
        appointment_date = timezone.localdate() + timedelta(days=3)
        with django_capture_on_commit_callbacks(execute=False):
            scheduled = self.client.post(
                f"/api/landlord/viewing-requests/{self.own_lead.id}/confirm-appointment/",
                {
                    "appointment_date": appointment_date.isoformat(),
                    "appointment_time_slot": ViewingRequest.TimeSlot.AFTERNOON,
                },
                format="json",
            )

        assert contacted.status_code == 200
        assert scheduled.status_code == 200
        self.own_lead.refresh_from_db()
        assert self.own_lead.status == ViewingRequest.Status.SCHEDULED
        assert self.own_lead.appointment_date == appointment_date
        assert ViewingRequestActivity.objects.filter(
            viewing_request=self.own_lead,
            actor=self.landlord,
            action="LANDLORD_STATUS_UPDATE",
        ).exists()

    def test_landlord_cannot_convert_request_by_patch(self):
        self.client.force_authenticate(self.landlord)

        response = self.client.patch(
            f"/api/landlord/viewing-requests/{self.own_lead.id}/",
            {"status": ViewingRequest.Status.CONVERTED},
            format="json",
        )

        assert response.status_code == 400
        self.own_lead.refresh_from_db()
        assert self.own_lead.status == ViewingRequest.Status.NEW

    def test_tenant_cannot_access_landlord_requests(self):
        self.client.force_authenticate(self.tenant)

        response = self.client.get("/api/landlord/viewing-requests/")

        assert response.status_code == 403
