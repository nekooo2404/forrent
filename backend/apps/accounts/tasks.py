from urllib.parse import urlencode

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail

User = get_user_model()


@shared_task
def send_password_reset_email(user_id, raw_token, reset_token_id):
    user = User.objects.get(pk=user_id)
    query = urlencode({"uid": user.id, "token": raw_token})
    reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/forgot-password?{query}"
    subject = "Dat lai mat khau Aurelian Reserve"
    message = (
        f"Xin chao {user.full_name},\n\n"
        "Ban vua yeu cau dat lai mat khau cho tai khoan Aurelian Reserve.\n"
        f"Vui long mo lien ket sau trong 30 phut de dat lai mat khau:\n{reset_url}\n\n"
        "Neu ban khong thuc hien yeu cau nay, hay bo qua email nay."
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    return {"user_id": user_id, "reset_token_id": reset_token_id}
