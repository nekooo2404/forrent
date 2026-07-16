from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string

User = get_user_model()

PURPOSE_LABELS = {
    "REGISTER": "xác thực email đăng ký",
    "PASSWORD_RESET": "đặt lại mật khẩu",
    "CHANGE_EMAIL": "xác nhận đổi email",
    "CHANGE_PASSWORD": "xác nhận đổi mật khẩu",
}


@shared_task
def send_otp_email(email, otp, purpose, token_id):
    label = PURPOSE_LABELS.get(purpose, "xác thực tài khoản")
    send_mail(
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
    return {"email": email, "purpose": purpose, "token_id": token_id}
