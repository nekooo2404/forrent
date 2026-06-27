import logging
import hashlib
import secrets
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import PasswordResetToken

logger = logging.getLogger(__name__)
User = get_user_model()


class AuthService:
    @staticmethod
    @transaction.atomic
    def register_tenant(*, full_name, date_of_birth, phone, email, password):
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError({"email": "This email is already registered."})
        if User.objects.filter(phone=phone).exists():
            raise ValidationError({"phone": "This phone is already registered."})

        user = User.objects.create_user(
            email=email.lower(),
            phone=phone,
            password=password,
            full_name=full_name,
            date_of_birth=date_of_birth,
            role=User.Role.TENANT,
        )
        logger.info("Tenant registered: user_id=%s", user.id)
        return user

    @staticmethod
    def login(*, identifier, password):
        user = User.objects.filter(email__iexact=identifier).first()
        if user is None:
            user = User.objects.filter(phone=identifier).first()
        if user is None:
            raise AuthenticationFailed("Invalid credentials.")

        authenticated_user = authenticate(username=user.email, password=password)
        if authenticated_user is None:
            raise AuthenticationFailed("Invalid credentials.")
        if not authenticated_user.is_active:
            raise AuthenticationFailed("User account is inactive.")

        refresh = RefreshToken.for_user(authenticated_user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": authenticated_user,
        }

    @staticmethod
    def logout(*, refresh_token):
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as exc:
            raise ValidationError({"refresh": "Invalid refresh token."}) from exc

    @staticmethod
    def change_password(*, user, old_password, new_password):
        if not user.check_password(old_password):
            raise ValidationError({"old_password": "Old password is incorrect."})
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        logger.info("Password changed: user_id=%s", user.id)
        return user

    @staticmethod
    def hash_reset_token(raw_token):
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @staticmethod
    @transaction.atomic
    def request_password_reset(*, email, requested_ip=None, user_agent=""):
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            logger.info("Password reset requested for non-existing email hash=%s", AuthService.hash_reset_token(email.lower())[:12])
            return None

        now = timezone.now()
        PasswordResetToken.objects.filter(user=user, used_at__isnull=True, expires_at__gt=now).update(
            used_at=now,
            updated_at=now,
        )

        raw_token = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token_hash=AuthService.hash_reset_token(raw_token),
            expires_at=now + timedelta(minutes=30),
            requested_ip=requested_ip,
            user_agent=user_agent[:500],
        )

        from apps.accounts.tasks import send_password_reset_email

        transaction.on_commit(lambda: send_password_reset_email.delay(user.id, raw_token, reset_token.id))
        logger.info("Password reset token created: user_id=%s token_id=%s", user.id, reset_token.id)
        return reset_token

    @staticmethod
    @transaction.atomic
    def confirm_password_reset(*, user_id, token, new_password):
        now = timezone.now()
        token_hash = AuthService.hash_reset_token(token)
        reset_token = (
            PasswordResetToken.objects.select_for_update()
            .select_related("user")
            .filter(
                user_id=user_id,
                token_hash=token_hash,
                used_at__isnull=True,
                expires_at__gt=now,
                user__is_active=True,
            )
            .first()
        )
        if reset_token is None:
            raise ValidationError({"token": "Password reset link is invalid or has expired."})

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        reset_token.mark_used()
        PasswordResetToken.objects.filter(user=user, used_at__isnull=True).exclude(pk=reset_token.pk).update(
            used_at=timezone.now(),
            updated_at=timezone.now(),
        )
        logger.info("Password reset confirmed: user_id=%s token_id=%s", user.id, reset_token.id)
        return user
