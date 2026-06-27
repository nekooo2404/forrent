import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.rooms.models import Room
from apps.viewing_requests.models import ViewingRequest

logger = logging.getLogger(__name__)


class ViewingRequestService:
    @staticmethod
    @transaction.atomic
    def create_viewing_request(*, user, room_id, preferred_viewing_date=None, preferred_viewing_time_slot=""):
        room = Room.objects.select_for_update().filter(pk=room_id).exclude(status=Room.Status.HIDDEN).first()
        if room is None:
            raise ValidationError({"room_id": "Room does not exist or is not available for public viewing."})

        duplicate = (
            ViewingRequest.objects.select_for_update()
            .filter(user=user, room=room, status__in=ViewingRequest.ACTIVE_STATUSES)
            .first()
        )
        if duplicate:
            raise ValidationError(
                {
                    "room_id": "You already have an active viewing request for this room.",
                    "viewing_request_id": duplicate.id,
                }
            )

        viewing_request = ViewingRequest.objects.create(
            user=user,
            room=room,
            full_name=user.full_name,
            date_of_birth=user.date_of_birth,
            preferred_viewing_date=preferred_viewing_date,
            preferred_viewing_time_slot=preferred_viewing_time_slot,
            phone=user.phone,
            email=user.email,
            status=ViewingRequest.Status.NEW,
            confirmed_at=timezone.now(),
            estimated_commission_amount=room.estimated_commission_amount,
            actual_commission_amount=0,
        )
        logger.info("Viewing request created: id=%s user_id=%s room_id=%s", viewing_request.id, user.id, room.id)
        return viewing_request

    @staticmethod
    @transaction.atomic
    def confirm_moved_in(*, viewing_request_id, actor):
        viewing_request = (
            ViewingRequest.objects.select_for_update()
            .select_related("room", "user")
            .get(pk=viewing_request_id)
        )

        if viewing_request.status == ViewingRequest.Status.MOVED_IN:
            raise ValidationError({"status": "This lead has already been confirmed as moved in."})
        if viewing_request.is_commission_counted:
            raise ValidationError({"is_commission_counted": "Commission has already been counted for this lead."})

        viewing_request.status = ViewingRequest.Status.MOVED_IN
        viewing_request.moved_in_at = timezone.now()
        viewing_request.actual_commission_amount = viewing_request.estimated_commission_amount
        viewing_request.is_commission_counted = True
        viewing_request.save(
            update_fields=[
                "status",
                "moved_in_at",
                "actual_commission_amount",
                "is_commission_counted",
                "updated_at",
            ]
        )
        logger.info(
            "Lead moved in confirmed: viewing_request_id=%s actor_id=%s commission=%s",
            viewing_request.id,
            actor.id,
            viewing_request.actual_commission_amount,
        )
        return viewing_request
