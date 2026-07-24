from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import CommandError, call_command

from apps.accounts.models import User
from apps.common.models import AuditLog


@pytest.mark.django_db
def test_create_admin_user_creates_non_superuser_saler():
    output = StringIO()
    with patch(
        "apps.accounts.management.commands.create_admin_user.getpass",
        side_effect=["A-strong-admin-password-2026!", "A-strong-admin-password-2026!"],
    ):
        call_command(
            "create_admin_user",
            email="new-admin@example.com",
            phone="0914032706",
            full_name="New Admin",
            stdout=output,
        )

    admin = User.objects.get(phone="0914032706")
    assert admin.email == "new-admin@example.com"
    assert admin.role == User.Role.SALER
    assert admin.is_staff is True
    assert admin.is_superuser is False
    assert admin.check_password("A-strong-admin-password-2026!")
    assert AuditLog.objects.filter(
        event="admin.user_provisioned",
        target_model="accounts.User",
        target_id=str(admin.pk),
    ).exists()


@pytest.mark.django_db
def test_create_admin_user_promotes_existing_user_and_resets_password():
    user = User.objects.create_user(
        email="existing-admin@example.com",
        phone="0914032707",
        password="Old-password-2026!",
        full_name="Existing User",
    )
    output = StringIO()
    with patch(
        "apps.accounts.management.commands.create_admin_user.getpass",
        side_effect=["A-new-admin-password-2026!", "A-new-admin-password-2026!"],
    ):
        call_command(
            "create_admin_user",
            email="existing-admin@example.com",
            phone="0914032707",
            full_name="Promoted Admin",
            stdout=output,
        )

    user.refresh_from_db()
    assert user.full_name == "Promoted Admin"
    assert user.role == User.Role.SALER
    assert user.is_staff is True
    assert user.is_superuser is False
    assert user.check_password("A-new-admin-password-2026!")
    assert not user.check_password("Old-password-2026!")
    assert AuditLog.objects.filter(
        event="admin.user_provisioned",
        target_model="accounts.User",
        target_id=str(user.pk),
    ).exists()


@pytest.mark.django_db
def test_send_test_telegram_resolves_user_by_normalized_phone():
    landlord = User.objects.create_user(
        email="telegram-landlord@example.com",
        phone="0382912254",
        password="A-strong-password-2026!",
        full_name="Telegram Landlord",
        role=User.Role.LANDLORD,
    )
    landlord.telegram_chat_id = "123456789"
    landlord.save(update_fields=["telegram_chat_id", "updated_at"])
    output = StringIO()

    with patch(
        "apps.accounts.management.commands.send_test_telegram.send_telegram_message",
        return_value={"message_id": 42},
    ) as send_message:
        call_command(
            "send_test_telegram",
            phone="+84382912254",
            message="ForRent test",
            stdout=output,
        )

    send_message.assert_called_once_with(
        chat_id="123456789",
        text="ForRent test",
    )
    command_output = output.getvalue()
    assert "***2254" in command_output
    assert "0382912254" not in command_output
    assert "123456789" not in command_output


@pytest.mark.django_db
def test_send_test_telegram_rejects_user_without_linked_chat():
    User.objects.create_user(
        email="unlinked-landlord@example.com",
        phone="0382912254",
        password="A-strong-password-2026!",
        full_name="Unlinked Landlord",
        role=User.Role.LANDLORD,
    )

    with patch(
        "apps.accounts.management.commands.send_test_telegram.send_telegram_message"
    ) as send_message:
        with pytest.raises(CommandError, match="has not linked Telegram"):
            call_command("send_test_telegram", phone="0382912254")

    send_message.assert_not_called()


@pytest.mark.django_db
def test_send_test_telegram_rejects_unknown_phone():
    with pytest.raises(CommandError, match="No active user found"):
        call_command("send_test_telegram", phone="0382912254")
