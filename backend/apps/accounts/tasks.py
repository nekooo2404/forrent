import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from apps.accounts.models import PasswordResetToken
from apps.common.cache_utils import execute_once
from apps.common.tasking import ReliableEmailTask, ReliableMaintenanceTask

User = get_user_model()
logger = logging.getLogger(__name__)

PURPOSE_LABELS = {
    "REGISTER": "xác thực email đăng ký",
    "PASSWORD_RESET": "đặt lại mật khẩu",
    "CHANGE_EMAIL": "xác nhận đổi email",
    "CHANGE_PASSWORD": "xác nhận đổi mật khẩu",
}


@shared_task(base=ReliableEmailTask, rate_limit="60/m")
def send_otp_email(email, otp, purpose, token_id):
    label = PURPOSE_LABELS.get(purpose, "xác thực tài khoản")

    def deliver():
        return send_mail(
            subject=f"Mã OTP ForRent - {label}",
            message=(
                "Xin chào,\n\n"
                f"Mã xác thực của bạn là: {otp}\n"
                "Mã này có hiệu lực trong 10 phút.\n\n"
                "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=render_to_string("emails/otp.html", {"label": label, "otp": otp}),
            fail_silently=False,
        )

    _result, delivered = execute_once(
        f"email:otp:{token_id}",
        deliver,
        done_timeout=60 * 60 * 24,
        cache_alias="coordination",
    )
    return {"delivered": delivered}


@shared_task(base=ReliableMaintenanceTask)
def cleanup_expired_auth_records():
    today = timezone.localdate()

    def cleanup():
        now = timezone.now()
        reset_cutoff = now - timedelta(days=settings.AUTH_TOKEN_RETENTION_DAYS)
        reset_tokens = PasswordResetToken.objects.filter(expires_at__lt=reset_cutoff)
        jwt_tokens = OutstandingToken.objects.filter(expires_at__lt=now)
        reset_count = reset_tokens.count()
        jwt_count = jwt_tokens.count()
        reset_tokens.delete()
        jwt_tokens.delete()
        logger.info(
            "expired_auth_records_cleaned",
            extra={
                "event": "celery_maintenance",
                "status": "success",
                "records_deleted": reset_count + jwt_count,
            },
        )
        return {
            "password_reset_tokens_deleted": reset_count,
            "jwt_tokens_deleted": jwt_count,
        }

    result, executed = execute_once(
        f"maintenance:expired-auth-records:{today.isoformat()}",
        cleanup,
        done_timeout=60 * 60 * 36,
        lock_timeout=60 * 10,
        cache_alias="coordination",
    )
    if not executed:
        return {"executed": False}
    return {"executed": True, **result}
