from datetime import timedelta

import pytest
from django.core import mail
from django.test import override_settings
from django.utils import timezone

from apps.rooms.tests.factories import create_room, create_user
from apps.viewing_requests.models import ViewingRequest
from apps.viewing_requests.tasks import send_appointment_confirmed_email, send_viewing_request_received_email


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
@pytest.mark.django_db
def test_viewing_request_emails_match_the_actual_workflow():
    tenant = create_user()
    room = create_room()
    preferred_date = timezone.localdate() + timedelta(days=1)
    confirmed_date = preferred_date + timedelta(days=1)
    viewing_request = ViewingRequest.objects.create(
        user=tenant,
        room=room,
        full_name=tenant.full_name,
        phone=tenant.phone,
        email=tenant.email,
        preferred_viewing_date=preferred_date,
        preferred_viewing_time_slot=ViewingRequest.TimeSlot.MORNING,
        appointment_date=confirmed_date,
        appointment_time_slot=ViewingRequest.TimeSlot.AFTERNOON,
        status=ViewingRequest.Status.SCHEDULED,
        estimated_commission_amount=room.estimated_commission_amount,
    )

    send_viewing_request_received_email(viewing_request.id)
    send_appointment_confirmed_email(viewing_request.id)

    assert len(mail.outbox) == 2
    assert mail.outbox[0].to == [tenant.email]
    assert "đã nhận yêu cầu" in mail.outbox[0].subject
    assert "Nhân viên tư vấn sẽ liên hệ" in mail.outbox[0].alternatives[0][0]
    assert "xác nhận lịch xem phòng" in mail.outbox[1].subject
    assert confirmed_date.strftime("%d/%m/%Y") in mail.outbox[1].alternatives[0][0]
