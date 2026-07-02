import logging
import hashlib
import hmac
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import PasswordResetToken
from apps.common.validators import normalize_vietnamese_phone

logger = logging.getLogger(__name__)
User = get_user_model()


class AuthService:
    @staticmethod
    @transaction.atomic
    def register_tenant(*, full_name, date_of_birth, phone, email, password, otp):
        email = email.lower()
        phone = normalize_vietnamese_phone(phone)
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError({"email": "This email is already registered."})
        if User.objects.filter(phone=phone).exists():
            raise ValidationError({"phone": "This phone is already registered."})
        AuthService.confirm_otp(email=email, otp=otp, purpose=PasswordResetToken.Purpose.REGISTER)

        user = User.objects.create_user(
            email=email,
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
    def change_password(*, user, old_password, new_password, otp):
        if not user.check_password(old_password):
            raise ValidationError({"old_password": "Old password is incorrect."})
        AuthService.confirm_otp(email=user.email, otp=otp, purpose=PasswordResetToken.Purpose.CHANGE_PASSWORD)
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        logger.info("Password changed: user_id=%s", user.id)
        return user

    @staticmethod
    def hash_reset_token(raw_token):
        return hmac.new(settings.SECRET_KEY.encode("utf-8"), raw_token.encode("utf-8"), hashlib.sha256).hexdigest()

    @staticmethod
    def issue_otp(*, email, purpose, requested_ip=None, user_agent="", user=None):
        normalized_email = email.lower()
        now = timezone.now()
        otp = "".join(secrets.choice(string.digits) for _ in range(6))
        PasswordResetToken.objects.filter(
            email__iexact=normalized_email,
            purpose=purpose,
            used_at__isnull=True,
            expires_at__gt=now,
        ).update(used_at=now, updated_at=now)
        token = PasswordResetToken.objects.create(
            user=user,
            email=normalized_email,
            purpose=purpose,
            token_hash=AuthService.hash_reset_token(otp),
            expires_at=now + timedelta(minutes=10),
            requested_ip=requested_ip,
            user_agent=user_agent[:500],
        )
        from apps.accounts.tasks import send_otp_email

        transaction.on_commit(lambda: send_otp_email.delay(normalized_email, otp, purpose, token.id))
        return token

    @staticmethod
    @transaction.atomic
    def confirm_otp(*, email, otp, purpose):
        token = (
            PasswordResetToken.objects.select_for_update()
            .filter(
                email__iexact=email,
                purpose=purpose,
                token_hash=AuthService.hash_reset_token(otp),
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            )
            .first()
        )
        if token is None:
            raise ValidationError({"otp": "OTP is invalid or has expired."})
        token.mark_used()
        return token

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

        reset_token = AuthService.issue_otp(
            email=user.email,
            purpose=PasswordResetToken.Purpose.PASSWORD_RESET,
            requested_ip=requested_ip,
            user_agent=user_agent,
            user=user,
        )
        logger.info("Password reset OTP created: user_id=%s token_id=%s", user.id, reset_token.id)
        return reset_token

    @staticmethod
    @transaction.atomic
    def confirm_password_reset(*, email, otp, new_password):
        now = timezone.now()
        reset_token = AuthService.confirm_otp(email=email, otp=otp, purpose=PasswordResetToken.Purpose.PASSWORD_RESET)
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            raise ValidationError({"email": "Password reset request is invalid or has expired."})
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        PasswordResetToken.objects.filter(user=user, used_at__isnull=True).exclude(pk=reset_token.pk).update(
            used_at=now,
            updated_at=now,
        )
        logger.info("Password reset confirmed: user_id=%s token_id=%s", user.id, reset_token.id)
        return user
