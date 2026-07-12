from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.rooms.tests.factories import create_admin, create_room, create_user
from apps.viewing_requests.models import ViewingRequest
from apps.commissions.models import CommissionPayout
from apps.common.models import AuditLog


@pytest.mark.django_db
class TestCommissionAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_confirm_moved_in_creates_pending_payout_record(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            status=ViewingRequest.Status.SCHEDULED,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)

        confirm_response = self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")
        list_response = self.client.get("/api/admin/commissions/payouts/")

        assert confirm_response.status_code == 200
        assert list_response.status_code == 200
        payout = list_response.data["data"]["results"][0]
        assert payout["viewing_request"] == lead.id
        assert Decimal(payout["amount"]) == Decimal("2500000.00")
        assert payout["status"] == "PENDING"

    def test_payout_cannot_skip_approval_before_paid(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            status=ViewingRequest.Status.SCHEDULED,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)
        self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")
        payout = CommissionPayout.objects.get(viewing_request=lead)

        response = self.client.patch(f"/api/admin/commissions/payouts/{payout.id}/", {"status": "PAID"}, format="json")

        assert response.status_code == 400
        payout.refresh_from_db()
        assert payout.status == CommissionPayout.Status.PENDING

    def test_payout_amount_is_immutable(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            status=ViewingRequest.Status.SCHEDULED,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)
        self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")
        payout = CommissionPayout.objects.get(viewing_request=lead)

        response = self.client.patch(
            f"/api/admin/commissions/payouts/{payout.id}/",
            {"amount": "1.00"},
            format="json",
        )

        assert response.status_code == 400
        payout.refresh_from_db()
        assert payout.amount == room.estimated_commission_amount

    def test_payout_approval_paid_and_cancel_audit_are_enforced(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            status=ViewingRequest.Status.SCHEDULED,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)
        self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")
        payout = CommissionPayout.objects.get(viewing_request=lead)

        approve_response = self.client.patch(f"/api/admin/commissions/payouts/{payout.id}/", {"status": "APPROVED"}, format="json")
        pay_response = self.client.patch(f"/api/admin/commissions/payouts/{payout.id}/", {"status": "PAID"}, format="json")
        locked_response = self.client.patch(f"/api/admin/commissions/payouts/{payout.id}/", {"status": "APPROVED"}, format="json")

        payout.refresh_from_db()
        assert approve_response.status_code == 200
        assert pay_response.status_code == 200
        assert locked_response.status_code == 400
        assert payout.status == CommissionPayout.Status.PAID
        assert payout.approved_by == admin
        assert payout.paid_by == admin
        assert payout.paid_at is not None
        assert AuditLog.objects.filter(event="commission.payout_status_changed", target_id=str(payout.id)).count() == 2

    def test_payout_cancel_requires_reason_and_audits_actor(self):
        tenant = create_user()
        admin = create_admin()
        room = create_room(created_by=admin)
        lead = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
            status=ViewingRequest.Status.SCHEDULED,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
        )
        self.client.force_authenticate(admin)
        self.client.post(f"/api/admin/viewing-requests/{lead.id}/confirm-moved-in/")
        payout = CommissionPayout.objects.get(viewing_request=lead)

        missing_reason = self.client.patch(f"/api/admin/commissions/payouts/{payout.id}/", {"status": "CANCELLED"}, format="json")
        cancel_response = self.client.patch(
            f"/api/admin/commissions/payouts/{payout.id}/",
            {"status": "CANCELLED", "note": "Hop dong bi huy."},
            format="json",
        )

        payout.refresh_from_db()
        assert missing_reason.status_code == 400
        assert cancel_response.status_code == 200
        assert payout.status == CommissionPayout.Status.CANCELLED
        assert payout.cancelled_by == admin
        assert payout.cancelled_at is not None
        assert AuditLog.objects.filter(event="commission.payout_status_changed", target_id=str(payout.id)).exists()
