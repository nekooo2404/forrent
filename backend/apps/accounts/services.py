import logging
import hashlib
import hmac
import secrets
import string
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.cache import caches
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import PasswordResetToken
from apps.common.cache_utils import CoordinationServiceUnavailable, increment_with_ttl
from apps.common.tasking import enqueue_task_on_commit
from apps.common.validators import normalize_vietnamese_phone

logger = logging.getLogger(__name__)
User = get_user_model()


class AuthService:
    @staticmethod
    @transaction.atomic
    def register_user(
        *,
        full_name,
        phone,
        email,
        password,
        otp,
        date_of_birth=None,
        role=User.Role.TENANT,
    ):
        if role not in {User.Role.TENANT, User.Role.LANDLORD}:
            raise ValidationError({"role": "Public registration only supports TENANT or LANDLORD."})
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
            role=role,
        )
        logger.info("User registered: user_id=%s role=%s", user.id, role)
        return user

    @staticmethod
    @transaction.atomic
    def register_tenant(*, full_name, phone, email, password, otp, date_of_birth=None):
        return AuthService.register_user(
            full_name=full_name,
            phone=phone,
            email=email,
            password=password,
            otp=otp,
            date_of_birth=date_of_birth,
            role=User.Role.TENANT,
        )

    @staticmethod
    def login(*, identifier, password):
        invalid_credentials_message = "Email/số điện thoại hoặc mật khẩu không đúng."
        normalized_identifier = (identifier or "").strip()
        user = User.objects.filter(email__iexact=normalized_identifier).first()
        if user is None:
            user = User.objects.filter(phone=normalize_vietnamese_phone(normalized_identifier)).first()
        if user is None:
            raise AuthenticationFailed(invalid_credentials_message)

        authenticated_user = authenticate(username=user.email, password=password)
        if authenticated_user is None:
            raise AuthenticationFailed(invalid_credentials_message)
        if not authenticated_user.is_active:
            raise AuthenticationFailed("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.")

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
    def claim_otp_cooldown(*, email, purpose):
        coordination_cache = caches["coordination"]
        normalized_email = email.lower()
        email_hash = AuthService.hash_reset_token(normalized_email)[:32]
        cooldown_key = f"otp:cooldown:{purpose}:{email_hash}"
        try:
            claimed = coordination_cache.add(
                cooldown_key,
                True,
                timeout=settings.OTP_REQUEST_COOLDOWN_SECONDS,
            )
        except Exception as exc:
            logger.exception("OTP cooldown cache unavailable")
            raise CoordinationServiceUnavailable() from exc
        if not claimed:
            raise ValidationError(
                {"email": f"Please wait {settings.OTP_REQUEST_COOLDOWN_SECONDS} seconds before requesting another OTP."}
            )

    @staticmethod
    def issue_otp(*, email, purpose, requested_ip=None, user_agent="", user=None, enforce_cooldown=True):
        normalized_email = email.lower()
        if enforce_cooldown:
            AuthService.claim_otp_cooldown(email=normalized_email, purpose=purpose)
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

        enqueue_task_on_commit(
            send_otp_email,
            normalized_email,
            otp,
            purpose,
            token.id,
            redact_args=True,
        )
        return token

    @staticmethod
    @transaction.atomic
    def confirm_otp(*, email, otp, purpose):
        coordination_cache = caches["coordination"]
        token = (
            PasswordResetToken.objects.select_for_update()
            .filter(
                email__iexact=email,
                purpose=purpose,
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            )
            .first()
        )
        if token is None:
            raise ValidationError({"otp": "OTP is invalid or has expired."})

        attempt_key = f"otp:attempts:{token.id}"
        try:
            attempts = int(coordination_cache.get(attempt_key, 0))
        except Exception as exc:
            logger.exception("OTP attempt cache unavailable")
            raise CoordinationServiceUnavailable() from exc
        if attempts >= settings.OTP_MAX_ATTEMPTS:
            raise ValidationError({"otp": "OTP is invalid or has expired."})

        supplied_hash = AuthService.hash_reset_token(otp)
        if not hmac.compare_digest(token.token_hash, supplied_hash):
            try:
                attempts = increment_with_ttl(
                    attempt_key,
                    timeout=settings.OTP_ATTEMPT_WINDOW_SECONDS,
                    cache_alias="coordination",
                )
            except Exception as exc:
                logger.exception("OTP attempt counter update failed")
                raise CoordinationServiceUnavailable() from exc
            raise ValidationError({"otp": "OTP is invalid or has expired."})

        try:
            coordination_cache.delete(attempt_key)
        except Exception:
            logger.warning("OTP attempt counter cleanup failed", exc_info=True)
        token.mark_used()
        return token

    @staticmethod
    @transaction.atomic
    def request_password_reset(*, email, requested_ip=None, user_agent=""):
        AuthService.claim_otp_cooldown(
            email=email,
            purpose=PasswordResetToken.Purpose.PASSWORD_RESET,
        )
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
            enforce_cooldown=False,
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
