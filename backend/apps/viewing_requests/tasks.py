from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from apps.viewing_requests.models import ViewingRequest


TIME_SLOT_LABELS = {
    ViewingRequest.TimeSlot.MORNING: "Sáng, 9:00 - 12:00",
    ViewingRequest.TimeSlot.AFTERNOON: "Chiều, 12:00 - 16:00",
    ViewingRequest.TimeSlot.EVENING: "Tối, 16:00 - 19:00",
}

ROOM_TYPE_LABELS = {
    "CCMN": "Chung cư mini",
    "CCDV": "Căn hộ dịch vụ",
    "HOUSE": "Nhà nguyên căn",
}


def _viewing_request(viewing_request_id):
    return (
        ViewingRequest.objects.select_related("room", "room__room_subtype", "room__ward", "room__city")
        .get(pk=viewing_request_id)
    )


def _room_label(viewing_request):
    room = viewing_request.room
    descriptor = room.room_subtype.name if room.room_subtype_id else ROOM_TYPE_LABELS.get(room.room_type, "Phòng thuê")
    location = room.ward.name or room.city.name
    return f"{descriptor} tại {location}"


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def send_viewing_request_received_email(viewing_request_id):
    viewing_request = _viewing_request(viewing_request_id)
    context = {
        "full_name": viewing_request.full_name,
        "room_label": _room_label(viewing_request),
        "date": viewing_request.preferred_viewing_date,
        "time_slot": TIME_SLOT_LABELS.get(viewing_request.preferred_viewing_time_slot, "Chưa chọn"),
        "profile_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profile",
    }
    send_mail(
        subject="ForRent đã nhận yêu cầu xem phòng của bạn",
        message=(
            f"Xin chào {viewing_request.full_name},\n\n"
            f"ForRent đã nhận yêu cầu xem {_room_label(viewing_request)}. "
            "Nhân viên tư vấn sẽ liên hệ để xác nhận ngày và giờ xem phòng.\n\n"
            "Bạn có thể theo dõi trạng thái trong trang cá nhân."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[viewing_request.email],
        html_message=render_to_string("emails/viewing_request_received.html", context),
        fail_silently=False,
    )


@shared_task(autoretry_for=(Exception,), retry_backoff=True, retry_jitter=True, max_retries=3)
def send_appointment_confirmed_email(viewing_request_id):
    viewing_request = _viewing_request(viewing_request_id)
    context = {
        "full_name": viewing_request.full_name,
        "room_label": _room_label(viewing_request),
        "date": viewing_request.appointment_date,
        "time_slot": TIME_SLOT_LABELS.get(viewing_request.appointment_time_slot, "Đã xác nhận"),
        "profile_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profile",
    }
    send_mail(
        subject="ForRent xác nhận lịch xem phòng",
        message=(
            f"Xin chào {viewing_request.full_name},\n\n"
            f"Lịch xem {_room_label(viewing_request)} đã được xác nhận vào "
            f"{viewing_request.appointment_date:%d/%m/%Y}, "
            f"{TIME_SLOT_LABELS.get(viewing_request.appointment_time_slot, 'theo giờ đã trao đổi')}.\n\n"
            "Vui lòng liên hệ ForRent nếu bạn cần thay đổi lịch."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[viewing_request.email],
        html_message=render_to_string("emails/appointment_confirmed.html", context),
        fail_silently=False,
    )
