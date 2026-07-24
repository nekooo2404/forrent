from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.commissions.models import CommissionPayout
from apps.rooms.tests.factories import create_room, create_user
from apps.viewing_requests.models import ViewingRequest


pytestmark = pytest.mark.django_db


def create_lead(*, room, tenant):
    return ViewingRequest.objects.create(
        user=tenant,
        room=room,
        full_name=tenant.full_name,
        phone=tenant.phone,
        email=tenant.email,
        preferred_viewing_date=timezone.localdate() + timedelta(days=1),
        preferred_viewing_time_slot=ViewingRequest.TimeSlot.MORNING,
    )


class TestLandlordCommissionAPI:
    def setup_method(self):
        self.client = APIClient()
        self.landlord = create_user(
            email="commission-owner@example.com",
            phone="0917100001",
            role=User.Role.LANDLORD,
        )
        self.other_landlord = create_user(
            email="commission-other-owner@example.com",
            phone="0917100002",
            role=User.Role.LANDLORD,
        )
        tenant = create_user(email="commission-tenant@example.com", phone="0917100003")
        other_tenant = create_user(email="commission-other-tenant@example.com", phone="0917100004")
        own_lead = create_lead(room=create_room(created_by=self.landlord), tenant=tenant)
        foreign_lead = create_lead(room=create_room(created_by=self.other_landlord), tenant=other_tenant)
        self.own_payout = CommissionPayout.objects.create(
            viewing_request=own_lead,
            amount=Decimal("2500000"),
        )
        self.foreign_payout = CommissionPayout.objects.create(
            viewing_request=foreign_lead,
            amount=Decimal("4000000"),
        )

    def test_landlord_only_sees_commissions_for_owned_rooms(self):
        self.client.force_authenticate(self.landlord)

        response = self.client.get("/api/landlord/commissions/")
        summary = self.client.get("/api/landlord/commissions/summary/")

        assert response.status_code == 200
        assert [item["id"] for item in response.data["data"]["results"]] == [self.own_payout.id]
        assert summary.status_code == 200
        assert summary.data["data"]["total"] == 1
        assert Decimal(summary.data["data"]["total_amount"]) == self.own_payout.amount

    def test_landlord_cannot_retrieve_foreign_commission(self):
        self.client.force_authenticate(self.landlord)

        response = self.client.get(f"/api/landlord/commissions/{self.foreign_payout.id}/")

        assert response.status_code == 404

    def test_landlord_commission_endpoint_is_read_only(self):
        self.client.force_authenticate(self.landlord)

        response = self.client.patch(
            f"/api/landlord/commissions/{self.own_payout.id}/",
            {"status": CommissionPayout.Status.PAID},
            format="json",
        )

        assert response.status_code == 405
        self.own_payout.refresh_from_db()
        assert self.own_payout.status == CommissionPayout.Status.PENDING
