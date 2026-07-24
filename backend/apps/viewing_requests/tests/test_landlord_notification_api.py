from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.rooms.tests.factories import create_room, create_user
from apps.viewing_requests.models import LandlordNotification
from apps.viewing_requests.services import ViewingRequestService


pytestmark = pytest.mark.django_db


class TestLandlordNotificationAPI:
    def setup_method(self):
        self.client = APIClient()
        self.landlord = create_user(
            email="notification-owner@example.com",
            phone="0917300001",
            role=User.Role.LANDLORD,
        )
        self.other_landlord = create_user(
            email="notification-other@example.com",
            phone="0917300002",
            role=User.Role.LANDLORD,
        )
        self.tenant = create_user(
            email="notification-tenant@example.com",
            phone="0917300003",
        )
        self.room = create_room(created_by=self.landlord)

    def create_request(self, *, room=None):
        return ViewingRequestService.create_viewing_request(
            user=self.tenant,
            room_id=(room or self.room).id,
            preferred_viewing_date=timezone.localdate() + timedelta(days=1),
            preferred_viewing_time_slot="morning",
        )

    def test_new_request_creates_owner_notification_and_feed(self):
        viewing_request = self.create_request()
        notification = LandlordNotification.objects.get(viewing_request=viewing_request)
        self.client.force_authenticate(self.landlord)

        response = self.client.get("/api/landlord/notifications/?limit=8")

        assert response.status_code == 200
        assert response.data["data"]["unread_count"] == 1
        result = response.data["data"]["results"][0]
        assert result == {
            "id": notification.id,
            "type": LandlordNotification.Type.NEW_VIEWING_REQUEST,
            "viewing_request": viewing_request.id,
            "room_id": self.room.id,
            "room_title": self.room.title,
            "room_code": self.room.room_code,
            "requester_name": self.tenant.full_name,
            "preferred_viewing_date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "preferred_viewing_time_slot": "morning",
            "is_read": False,
            "read_at": None,
            "created_at": result["created_at"],
        }

    def test_notification_is_not_created_for_platform_owned_room(self):
        saler = create_user(
            email="notification-saler@example.com",
            phone="0917300004",
            role=User.Role.SALER,
        )

        viewing_request = self.create_request(room=create_room(created_by=saler))

        assert not LandlordNotification.objects.filter(viewing_request=viewing_request).exists()

    def test_contact_conversion_also_notifies_room_owner(self):
        viewing_request = ViewingRequestService.create_contact_viewing_request(
            user=self.tenant,
            room=self.room,
            full_name=self.tenant.full_name,
            phone=self.tenant.phone,
            email=self.tenant.email,
        )

        assert LandlordNotification.objects.filter(
            recipient=self.landlord,
            viewing_request=viewing_request,
            type=LandlordNotification.Type.NEW_VIEWING_REQUEST,
        ).exists()

    def test_landlord_cannot_read_or_mark_foreign_notification(self):
        viewing_request = self.create_request()
        notification = LandlordNotification.objects.get(viewing_request=viewing_request)
        self.client.force_authenticate(self.other_landlord)

        feed = self.client.get("/api/landlord/notifications/")
        mark_read = self.client.post(f"/api/landlord/notifications/{notification.id}/mark-read/")

        assert feed.status_code == 200
        assert feed.data["data"] == {"unread_count": 0, "results": []}
        assert mark_read.status_code == 404
        notification.refresh_from_db()
        assert notification.read_at is None

    def test_owner_can_mark_one_or_all_notifications_as_read(self):
        first_request = self.create_request()
        first = LandlordNotification.objects.get(viewing_request=first_request)
        second_tenant = create_user(
            email="notification-second-tenant@example.com",
            phone="0917300005",
        )
        second_request = ViewingRequestService.create_viewing_request(
            user=second_tenant,
            room_id=self.room.id,
            preferred_viewing_date=timezone.localdate() + timedelta(days=2),
            preferred_viewing_time_slot="afternoon",
        )
        second = LandlordNotification.objects.get(viewing_request=second_request)
        self.client.force_authenticate(self.landlord)

        mark_one = self.client.post(f"/api/landlord/notifications/{first.id}/mark-read/")
        mark_all = self.client.post("/api/landlord/notifications/mark-all-read/")

        assert mark_one.status_code == 200
        assert mark_one.data["data"]["is_read"] is True
        assert mark_all.status_code == 200
        assert mark_all.data["data"] == {"updated_count": 1, "unread_count": 0}
        first.refresh_from_db()
        second.refresh_from_db()
        assert first.read_at is not None
        assert second.read_at is not None

    def test_tenant_cannot_access_landlord_notifications(self):
        self.client.force_authenticate(self.tenant)

        response = self.client.get("/api/landlord/notifications/")

        assert response.status_code == 403
