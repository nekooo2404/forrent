from unittest import mock

import pytest
from django.core import mail
from django.core.cache import cache, caches
from django.test import override_settings
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from apps.accounts.models import PasswordResetToken
from apps.accounts.services import AuthService
from apps.accounts.tasks import cleanup_expired_auth_records, send_otp_email
from apps.rooms.tests.factories import create_user


@pytest.mark.django_db
def test_otp_is_enqueued_after_commit_with_redacted_publish_metadata():
    with mock.patch("apps.accounts.services.enqueue_task_on_commit") as enqueue_email:
        token = AuthService.issue_otp(
            email="tenant@example.com",
            purpose=PasswordResetToken.Purpose.REGISTER,
        )

    task, email, otp, purpose, token_id = enqueue_email.call_args.args
    assert task.name == "apps.accounts.tasks.send_otp_email"
    assert email == "tenant@example.com"
    assert otp.isdigit() and len(otp) == 6
    assert purpose == PasswordResetToken.Purpose.REGISTER
    assert token_id == token.id
    assert enqueue_email.call_args.kwargs == {"redact_args": True}


@override_settings(AUTH_TOKEN_RETENTION_DAYS=30)
@pytest.mark.django_db
def test_cleanup_expired_auth_records_is_idempotent_and_respects_retention():
    from datetime import timedelta

    now = timezone.now()
    user = create_user()
    expired_reset = PasswordResetToken.objects.create(
        user=user,
        email=user.email,
        token_hash="a" * 64,
        expires_at=now - timedelta(days=31),
    )
    recent_reset = PasswordResetToken.objects.create(
        user=user,
        email=user.email,
        token_hash="b" * 64,
        expires_at=now - timedelta(days=1),
    )
    expired_jwt = OutstandingToken.objects.create(
        user=user,
        jti="expired-jwt",
        token="expired-token",
        created_at=now - timedelta(days=2),
        expires_at=now - timedelta(days=1),
    )
    active_jwt = OutstandingToken.objects.create(
        user=user,
        jti="active-jwt",
        token="active-token",
        created_at=now,
        expires_at=now + timedelta(days=1),
    )

    first = cleanup_expired_auth_records()
    second = cleanup_expired_auth_records()

    assert first == {
        "executed": True,
        "password_reset_tokens_deleted": 1,
        "jwt_tokens_deleted": 1,
    }
    assert second == {"executed": False}
    assert not PasswordResetToken.objects.filter(pk=expired_reset.pk).exists()
    assert PasswordResetToken.objects.filter(pk=recent_reset.pk).exists()
    assert not OutstandingToken.objects.filter(pk=expired_jwt.pk).exists()
    assert OutstandingToken.objects.filter(pk=active_jwt.pk).exists()


def test_otp_email_includes_branded_html_template():
    cache.clear()
    caches["coordination"].clear()
    send_otp_email("tenant@example.com", "123456", "REGISTER", 1)
    send_otp_email("tenant@example.com", "123456", "REGISTER", 1)

    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    html = next(content for content, mimetype in message.alternatives if mimetype == "text/html")

    assert "Xác thực tài khoản" in html
    assert "123456" in html
    assert "10 phút" in html
    assert "Đội ngũ ForRent" in html
