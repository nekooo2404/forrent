import os
from datetime import timedelta
from unittest import mock

import pytest
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.rooms.tests.factories import create_room, create_user
from apps.viewing_requests.models import LandlordNotification, ViewingRequest
from apps.viewing_requests.services import ViewingRequestService
from apps.viewing_requests.tasks import send_landlord_viewing_request_notification


pytestmark = pytest.mark.django_db


def create_notification(*, telegram_chat_id="-1001234567890"):
    landlord = create_user(
        email="delivery-landlord@example.com",
        phone="0917400001",
        role=User.Role.LANDLORD,
    )
    landlord.telegram_chat_id = telegram_chat_id
    landlord.save(update_fields=["telegram_chat_id", "updated_at"])
    tenant = create_user(
        email="delivery-tenant@example.com",
        phone="0917400002",
    )
    room = create_room(created_by=landlord)
    viewing_request = ViewingRequest.objects.create(
        user=tenant,
        room=room,
        full_name="Nguyen Van Khach",
        phone="0917400002",
        email=tenant.email,
        preferred_viewing_date=timezone.localdate() + timedelta(days=1),
        preferred_viewing_time_slot=ViewingRequest.TimeSlot.MORNING,
    )
    notification = LandlordNotification.objects.create(
        recipient=landlord,
        viewing_request=viewing_request,
        type=LandlordNotification.Type.NEW_VIEWING_REQUEST,
    )
    return landlord, viewing_request, notification


def test_viewing_request_enqueues_owner_delivery_after_commit():
    landlord = create_user(
        email="enqueue-landlord@example.com",
        phone="0917400003",
        role=User.Role.LANDLORD,
    )
    tenant = create_user(
        email="enqueue-tenant@example.com",
        phone="0917400004",
    )
    room = create_room(created_by=landlord)

    with mock.patch("apps.viewing_requests.services.enqueue_task_on_commit") as enqueue:
        viewing_request = ViewingRequestService.create_viewing_request(
            user=tenant,
            room_id=room.id,
            preferred_viewing_date=timezone.localdate() + timedelta(days=1),
            preferred_viewing_time_slot=ViewingRequest.TimeSlot.AFTERNOON,
        )

    notification = LandlordNotification.objects.get(viewing_request=viewing_request)
    landlord_calls = [
        call
        for call in enqueue.call_args_list
        if call.args[0].name.endswith("send_landlord_viewing_request_notification")
    ]
    assert len(landlord_calls) == 1
    assert landlord_calls[0].args[1] == notification.id


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    TELEGRAM_BOT_TOKEN="test-bot-token",
)
def test_delivery_sends_branded_email_and_owner_scoped_telegram_once():
    landlord, viewing_request, notification = create_notification()

    with mock.patch("apps.viewing_requests.tasks.send_telegram_message") as send_telegram:
        first = send_landlord_viewing_request_notification(notification.id)
        second = send_landlord_viewing_request_notification(notification.id)

    notification.refresh_from_db()
    assert first == {
        "notification_id": notification.id,
        "email_delivered": True,
        "telegram_delivered": True,
    }
    assert second == {
        "notification_id": notification.id,
        "email_delivered": False,
        "telegram_delivered": False,
    }
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == [landlord.email]
    assert "yêu cầu xem phòng mới" in mail.outbox[0].subject.lower()
    html = mail.outbox[0].alternatives[0][0]
    assert viewing_request.full_name in html
    assert viewing_request.phone in html
    assert viewing_request.room.title in html
    send_telegram.assert_called_once()
    assert send_telegram.call_args.kwargs["chat_id"] == landlord.telegram_chat_id
    assert viewing_request.full_name in send_telegram.call_args.kwargs["text"]
    assert viewing_request.room.title in send_telegram.call_args.kwargs["text"]
    assert notification.email_sent_at is not None
    assert notification.telegram_sent_at is not None


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    TELEGRAM_BOT_TOKEN="",
)
def test_delivery_keeps_email_working_when_telegram_is_not_configured():
    landlord, _viewing_request, notification = create_notification(telegram_chat_id="")

    with mock.patch("apps.viewing_requests.tasks.send_telegram_message") as send_telegram:
        result = send_landlord_viewing_request_notification(notification.id)

    notification.refresh_from_db()
    assert result == {
        "notification_id": notification.id,
        "email_delivered": True,
        "telegram_delivered": False,
    }
    assert mail.outbox[0].to == [landlord.email]
    send_telegram.assert_not_called()
    assert notification.email_sent_at is not None
    assert notification.telegram_sent_at is None


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    TELEGRAM_BOT_TOKEN="",
)
def test_delivery_records_missing_bot_configuration_without_blocking_email():
    _landlord, _viewing_request, notification = create_notification()

    result = send_landlord_viewing_request_notification(notification.id)

    notification.refresh_from_db()
    assert result["email_delivered"] is True
    assert result["telegram_delivered"] is False
    assert notification.last_delivery_error == "telegram:not_configured"


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    TELEGRAM_BOT_TOKEN="test-bot-token",
)
def test_email_is_not_resent_when_telegram_retry_fails_once():
    _landlord, _viewing_request, notification = create_notification()

    with mock.patch(
        "apps.viewing_requests.tasks.send_telegram_message",
        side_effect=[OSError("temporary network failure"), None],
    ) as send_telegram:
        with pytest.raises(OSError):
            send_landlord_viewing_request_notification(notification.id)
        send_landlord_viewing_request_notification(notification.id)

    notification.refresh_from_db()
    assert len(mail.outbox) == 1
    assert send_telegram.call_count == 2
    assert notification.email_sent_at is not None
    assert notification.telegram_sent_at is not None


@pytest.mark.skipif(
    os.environ.get("RUN_LIVE_TELEGRAM_TEST") != "1",
    reason="Live Telegram delivery is opt-in.",
)
def test_live_web_viewing_request_delivers_owner_telegram(
    django_capture_on_commit_callbacks,
):
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.environ.get("TELEGRAM_LIVE_TEST_CHAT_ID", "")
    assert token and chat_id

    landlord = create_user(
        email="live-telegram-landlord@example.com",
        phone="0917400011",
        role=User.Role.LANDLORD,
    )
    landlord.telegram_chat_id = chat_id
    landlord.save(update_fields=["telegram_chat_id", "updated_at"])
    tenant = create_user(
        email="live-telegram-tenant@example.com",
        phone="0917400012",
    )
    tenant.full_name = "Khach kiem thu Telegram"
    tenant.save(update_fields=["full_name", "updated_at"])
    room = create_room(created_by=landlord)
    room.title = "Phong kiem thu thong bao Telegram"
    room.save(update_fields=["title", "updated_at"])
    client = APIClient()
    client.force_authenticate(tenant)

    with override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        TELEGRAM_BOT_TOKEN=token,
        CELERY_TASK_ALWAYS_EAGER=True,
        CELERY_TASK_EAGER_PROPAGATES=True,
    ):
        with django_capture_on_commit_callbacks(execute=True):
            response = client.post(
                "/api/viewing-requests/",
                {
                    "room_id": room.id,
                    "preferred_viewing_date": (timezone.localdate() + timedelta(days=1)).isoformat(),
                    "preferred_viewing_time_slot": ViewingRequest.TimeSlot.MORNING,
                },
                format="json",
            )

    assert response.status_code == 201
    notification = LandlordNotification.objects.get(
        viewing_request_id=response.data["data"]["id"],
        recipient=landlord,
    )
    assert notification.telegram_sent_at is not None
    assert notification.last_delivery_error == ""
