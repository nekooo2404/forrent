import logging
from datetime import timedelta

from celery import group, shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from apps.common.cache_utils import execute_once
from apps.common.email import SendifyEmailError, SendifyEmailTransientError
from apps.common.tasking import ReliableEmailTask, ReliableMaintenanceTask, ReliableNotificationTask
from apps.common.telegram import TelegramTransientError, send_telegram_message
from apps.viewing_requests.models import LandlordNotification, ViewingRequest


logger = logging.getLogger(__name__)

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


def _landlord_notification(notification_id):
    return (
        LandlordNotification.objects.select_related(
            "recipient",
            "viewing_request__room",
            "viewing_request__room__created_by",
            "viewing_request__room__room_subtype",
            "viewing_request__room__ward",
            "viewing_request__room__city",
        )
        .get(pk=notification_id)
    )


def _landlord_message(notification):
    viewing_request = notification.viewing_request
    date_label = (
        viewing_request.preferred_viewing_date.strftime("%d/%m/%Y")
        if viewing_request.preferred_viewing_date
        else "Chưa chọn ngày"
    )
    time_label = TIME_SLOT_LABELS.get(
        viewing_request.preferred_viewing_time_slot,
        "Chưa chọn khung giờ",
    )
    return (
        "ForRent - Yêu cầu xem phòng mới\n"
        f"Khách: {viewing_request.full_name}\n"
        f"Số điện thoại: {viewing_request.phone}\n"
        f"Phòng: {viewing_request.room.title}\n"
        f"Thời gian mong muốn: {date_label} · {time_label}\n"
        f"Quản lý: {settings.FRONTEND_BASE_URL.rstrip('/')}/landlord/viewing-requests"
    )


@shared_task(base=ReliableNotificationTask, rate_limit="180/m")
def send_landlord_viewing_request_notification(notification_id):
    try:
        notification = _landlord_notification(notification_id)
    except LandlordNotification.DoesNotExist:
        return {
            "notification_id": notification_id,
            "email_delivered": False,
            "telegram_delivered": False,
        }
    recipient = notification.recipient
    room = notification.viewing_request.room
    if (
        not recipient.is_active
        or recipient.role != recipient.Role.LANDLORD
        or room.created_by_id != recipient.id
    ):
        logger.warning(
            "landlord_notification_delivery_skipped",
            extra={
                "event": "landlord_notification_delivery",
                "notification_id": notification.id,
                "status": "recipient_scope_mismatch",
            },
        )
        return {
            "notification_id": notification.id,
            "email_delivered": False,
            "telegram_delivered": False,
        }

    LandlordNotification.objects.filter(pk=notification.id).update(
        delivery_attempted_at=timezone.now(),
        last_delivery_error="",
    )
    errors = []
    email_delivered = False
    telegram_delivered = False
    telegram_configuration_missing = bool(
        recipient.telegram_chat_id and not settings.TELEGRAM_BOT_TOKEN
    )
    context = {
        "landlord_name": recipient.full_name,
        "requester_name": notification.viewing_request.full_name,
        "requester_phone": notification.viewing_request.phone,
        "room_title": room.title,
        "date": notification.viewing_request.preferred_viewing_date,
        "time_slot": TIME_SLOT_LABELS.get(
            notification.viewing_request.preferred_viewing_time_slot,
            "Chưa chọn",
        ),
        "portal_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/landlord/viewing-requests",
    }

    if notification.email_sent_at is None and recipient.email:
        def deliver_email():
            sent = send_mail(
                subject="ForRent - Yêu cầu xem phòng mới",
                message=(
                    f"Xin chào {recipient.full_name},\n\n"
                    f"{notification.viewing_request.full_name} ({notification.viewing_request.phone}) "
                    f"vừa gửi yêu cầu xem phòng {room.title}.\n"
                    "Vui lòng mở cổng quản trị người dùng để liên hệ và xác nhận lịch."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                html_message=render_to_string("emails/landlord_new_viewing_request.html", context),
                fail_silently=False,
            )
            if sent != 1:
                raise SendifyEmailError("Email provider did not accept the landlord notification.")
            sent_at = timezone.now()
            LandlordNotification.objects.filter(
                pk=notification.id,
                email_sent_at__isnull=True,
            ).update(email_sent_at=sent_at, updated_at=sent_at)

        try:
            _result, email_delivered = execute_once(
                f"landlord-notification:{notification.id}:email",
                deliver_email,
                done_timeout=60 * 60 * 24 * 30,
                cache_alias="coordination",
            )
        except Exception as exc:
            errors.append(("email", exc))

    if (
        notification.telegram_sent_at is None
        and settings.TELEGRAM_BOT_TOKEN
        and recipient.telegram_chat_id
    ):
        def deliver_telegram():
            send_telegram_message(
                chat_id=recipient.telegram_chat_id,
                text=_landlord_message(notification),
            )
            sent_at = timezone.now()
            LandlordNotification.objects.filter(
                pk=notification.id,
                telegram_sent_at__isnull=True,
            ).update(telegram_sent_at=sent_at, updated_at=sent_at)

        try:
            _result, telegram_delivered = execute_once(
                f"landlord-notification:{notification.id}:telegram",
                deliver_telegram,
                done_timeout=60 * 60 * 24 * 30,
                cache_alias="coordination",
            )
        except Exception as exc:
            errors.append(("telegram", exc))

    if errors:
        safe_errors = [
            f"{channel}:"
            f"{'transient' if isinstance(exc, (OSError, SendifyEmailTransientError, TelegramTransientError)) else 'failed'}"
            for channel, exc in errors
        ]
        if telegram_configuration_missing:
            safe_errors.append("telegram:not_configured")
        safe_error = ";".join(safe_errors)[:120]
        LandlordNotification.objects.filter(pk=notification.id).update(
            last_delivery_error=safe_error,
            updated_at=timezone.now(),
        )
        raise errors[0][1]

    if telegram_configuration_missing:
        LandlordNotification.objects.filter(pk=notification.id).update(
            last_delivery_error="telegram:not_configured",
            updated_at=timezone.now(),
        )
        logger.error(
            "landlord_notification_telegram_not_configured",
            extra={
                "event": "landlord_notification_delivery",
                "notification_id": notification.id,
                "status": "telegram_not_configured",
            },
        )

    logger.info(
        "landlord_notification_delivery_completed",
        extra={
            "event": "landlord_notification_delivery",
            "notification_id": notification.id,
            "email_delivered": email_delivered,
            "telegram_delivered": telegram_delivered,
        },
    )

    return {
        "notification_id": notification.id,
        "email_delivered": email_delivered,
        "telegram_delivered": telegram_delivered,
    }


@shared_task(base=ReliableEmailTask, rate_limit="120/m")
def send_viewing_request_received_email(viewing_request_id):
    viewing_request = _viewing_request(viewing_request_id)
    context = {
        "full_name": viewing_request.full_name,
        "room_label": _room_label(viewing_request),
        "date": viewing_request.preferred_viewing_date,
        "time_slot": TIME_SLOT_LABELS.get(viewing_request.preferred_viewing_time_slot, "Chưa chọn"),
        "profile_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profile",
    }
    def deliver():
        return send_mail(
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

    _result, delivered = execute_once(
        f"email:viewing-request-received:{viewing_request.id}",
        deliver,
        done_timeout=60 * 60 * 24 * 30,
        cache_alias="coordination",
    )
    return {"viewing_request_id": viewing_request.id, "delivered": delivered}


@shared_task(base=ReliableEmailTask, rate_limit="120/m")
def send_appointment_confirmed_email(viewing_request_id):
    viewing_request = _viewing_request(viewing_request_id)
    context = {
        "full_name": viewing_request.full_name,
        "room_label": _room_label(viewing_request),
        "date": viewing_request.appointment_date,
        "time_slot": TIME_SLOT_LABELS.get(viewing_request.appointment_time_slot, "Đã xác nhận"),
        "profile_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profile",
    }
    def deliver():
        return send_mail(
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

    appointment_key = (
        f"{viewing_request.id}:{viewing_request.appointment_date}:"
        f"{viewing_request.appointment_time_slot}"
    )
    _result, delivered = execute_once(
        f"email:appointment-confirmed:{appointment_key}",
        deliver,
        done_timeout=60 * 60 * 24 * 30,
        cache_alias="coordination",
    )
    return {"viewing_request_id": viewing_request.id, "delivered": delivered}


@shared_task(base=ReliableEmailTask, rate_limit="120/m")
def send_appointment_reminder_email(viewing_request_id):
    try:
        viewing_request = _viewing_request(viewing_request_id)
    except ViewingRequest.DoesNotExist:
        logger.info(
            "appointment_reminder_skipped",
            extra={"event": "appointment_reminder", "status": "not_found"},
        )
        return {"viewing_request_id": viewing_request_id, "delivered": False}

    if (
        viewing_request.status != ViewingRequest.Status.SCHEDULED
        or not viewing_request.appointment_date
        or viewing_request.appointment_date < timezone.localdate()
    ):
        return {"viewing_request_id": viewing_request_id, "delivered": False}

    context = {
        "full_name": viewing_request.full_name,
        "room_label": _room_label(viewing_request),
        "date": viewing_request.appointment_date,
        "time_slot": TIME_SLOT_LABELS.get(viewing_request.appointment_time_slot, "Theo lich da xac nhan"),
        "profile_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profile",
    }

    def deliver():
        return send_mail(
            subject="ForRent nh\u1eafc l\u1ecbch xem ph\u00f2ng c\u1ee7a b\u1ea1n",
            message=(
                f"Xin chao {viewing_request.full_name},\n\n"
                f"ForRent nhac ban ve lich xem {_room_label(viewing_request)} vao "
                f"{viewing_request.appointment_date:%d/%m/%Y}.\n\n"
                "Vui long lien he ForRent neu ban can thay doi lich."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[viewing_request.email],
            html_message=render_to_string("emails/appointment_reminder.html", context),
            fail_silently=False,
        )

    reminder_key = (
        f"{viewing_request.id}:{viewing_request.appointment_date}:"
        f"{viewing_request.appointment_time_slot}"
    )
    _result, delivered = execute_once(
        f"email:appointment-reminder:{reminder_key}",
        deliver,
        done_timeout=60 * 60 * 24 * 30,
        cache_alias="coordination",
    )
    return {"viewing_request_id": viewing_request.id, "delivered": delivered}


@shared_task(base=ReliableMaintenanceTask)
def dispatch_appointment_reminders():
    target_date = timezone.localdate() + timedelta(days=1)
    if not settings.APPOINTMENT_REMINDERS_ENABLED:
        return {"executed": False, "scheduled": 0}

    def dispatch():
        viewing_request_ids = list(
            ViewingRequest.objects.filter(
                status=ViewingRequest.Status.SCHEDULED,
                appointment_date=target_date,
            )
            .order_by("id")
            .values_list("id", flat=True)
        )
        if viewing_request_ids:
            group(
                send_appointment_reminder_email.s(viewing_request_id).set(priority=7)
                for viewing_request_id in viewing_request_ids
            ).apply_async()
        return len(viewing_request_ids)

    scheduled, executed = execute_once(
        f"maintenance:appointment-reminders:{target_date.isoformat()}",
        dispatch,
        done_timeout=60 * 60 * 36,
        lock_timeout=60 * 10,
        cache_alias="coordination",
    )
    return {"executed": executed, "scheduled": scheduled or 0}
