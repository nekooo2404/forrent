from io import StringIO
from unittest import mock

import pytest
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.rooms.tests.factories import create_room, create_user
from apps.viewing_requests.management.commands.smoke_landlord_notifications import (
    SMOKE_EMAIL_PREFIX,
)
from apps.viewing_requests.models import LandlordNotification, ViewingRequest


pytestmark = pytest.mark.django_db


def test_smoke_command_creates_web_feed_delivers_telegram_and_cleans_up():
    landlord = create_user(
        email="smoke-owner@example.com",
        phone="0382912254",
        role=User.Role.LANDLORD,
    )
    landlord.telegram_chat_id = "123456789"
    landlord.save(update_fields=["telegram_chat_id", "updated_at"])
    room = create_room(created_by=landlord)
    output = StringIO()

    with override_settings(TELEGRAM_BOT_TOKEN="test-token"):
        with mock.patch(
            "apps.viewing_requests.tasks.send_telegram_message",
            return_value={"message_id": 42},
        ) as send_telegram:
            call_command(
                "smoke_landlord_notifications",
                phone="+84382912254",
                room_id=room.id,
                apply=True,
                deliver_telegram=True,
                stdout=output,
            )

    notification = LandlordNotification.objects.select_related("viewing_request").get(
        recipient=landlord,
    )
    assert notification.telegram_sent_at is not None
    assert notification.read_at is None
    assert notification.viewing_request.email.startswith(SMOKE_EMAIL_PREFIX)
    send_telegram.assert_called_once()
    assert send_telegram.call_args.kwargs["chat_id"] == landlord.telegram_chat_id

    client = APIClient()
    client.force_authenticate(landlord)
    feed = client.get("/api/landlord/notifications/?limit=8")
    assert feed.status_code == 200
    assert feed.data["data"]["unread_count"] == 1
    assert feed.data["data"]["results"][0]["id"] == notification.id

    command_output = output.getvalue()
    assert "telegram_delivered=true" in command_output
    assert "0382912254" not in command_output
    assert landlord.telegram_chat_id not in command_output

    call_command(
        "smoke_landlord_notifications",
        phone="0382912254",
        cleanup=True,
        apply=True,
        stdout=StringIO(),
    )
    assert not ViewingRequest.objects.filter(email__startswith=SMOKE_EMAIL_PREFIX).exists()
    assert not User.objects.filter(email__startswith=SMOKE_EMAIL_PREFIX).exists()


def test_smoke_command_is_dry_run_by_default():
    landlord = create_user(
        email="smoke-dry-run-owner@example.com",
        phone="0382912254",
        role=User.Role.LANDLORD,
    )
    room = create_room(created_by=landlord)
    output = StringIO()

    call_command(
        "smoke_landlord_notifications",
        phone=landlord.phone,
        room_id=room.id,
        stdout=output,
    )

    assert "Dry run" in output.getvalue()
    assert not ViewingRequest.objects.filter(email__startswith=SMOKE_EMAIL_PREFIX).exists()
