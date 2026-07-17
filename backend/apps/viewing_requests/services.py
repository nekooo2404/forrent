import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.rooms.models import Room
from apps.common.audit import audit_event
from apps.viewing_requests.models import RoomLease, ViewingRequest, ViewingRequestActivity

logger = logging.getLogger(__name__)


class ViewingRequestService:
    @staticmethod
    @transaction.atomic
    def bulk_update(*, ids, updates, actor, request=None):
        leads = list(ViewingRequest.objects.select_for_update().filter(id__in=ids))
        missing_ids = sorted(set(ids) - {lead.id for lead in leads})
        if missing_ids:
            raise ValidationError({"ids": f"Unknown lead IDs: {missing_ids}."})
        next_status = updates.get("status")
        invalid_ids = [lead.id for lead in leads if next_status and not ViewingRequest.can_transition(lead.status, next_status)]
        if invalid_ids:
            raise ValidationError({"status": f"Invalid status transition for lead IDs: {invalid_ids}."})
        for lead in leads:
            previous_status = lead.status
            for field, value in updates.items():
                setattr(lead, field, value)
            if not updates:
                continue
            lead.save(update_fields=[*updates, "updated_at"])
            ViewingRequestActivity.objects.create(
                viewing_request=lead,
                actor=actor,
                action="BULK_UPDATE",
                note=updates.get("saler_note", ""),
            )
            if lead.status != previous_status:
                audit_event(
                    "viewing_request.status_changed",
                    request=request,
                    actor=actor,
                    target=lead,
                    metadata={"from": previous_status, "to": lead.status},
                )
        updated_count = len(leads) if updates else 0
        audit_event(
            "viewing_request.bulk_updated",
            request=request,
            actor=actor,
            metadata={"ids": ids, "fields": list(updates), "updated_count": updated_count},
        )
        return updated_count

    @staticmethod
    def _active_duplicate(*, room, user, phone, email):
        return (
            ViewingRequest.objects.select_for_update()
            .filter(
                Q(user=user) | Q(phone=phone) | Q(email__iexact=email),
                room=room,
                status__in=ViewingRequest.ACTIVE_STATUSES,
            )
            .first()
        )

    @staticmethod
    @transaction.atomic
    def create_viewing_request(*, user, room_id, preferred_viewing_date=None, preferred_viewing_time_slot=""):
        room = Room.objects.select_for_update().filter(pk=room_id, status=Room.Status.PUBLISHED).first()
        if room is None:
            raise ValidationError({"room_id": "Room does not exist or is not available for viewing."})

        duplicate = ViewingRequestService._active_duplicate(
            room=room,
            user=user,
            phone=user.phone,
            email=user.email,
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
            estimated_commission_amount=room.estimated_commission_amount,
            actual_commission_amount=0,
        )
        logger.info("Viewing request created: id=%s user_id=%s room_id=%s", viewing_request.id, user.id, room.id)
        return viewing_request

    @staticmethod
    @transaction.atomic
    def create_contact_viewing_request(*, user, room, full_name, phone, email):
        room = Room.objects.select_for_update().filter(pk=room.pk, status=Room.Status.PUBLISHED).first()
        if room is None:
            raise ValidationError({"room": "Room does not exist or is not available for viewing."})

        duplicate = ViewingRequestService._active_duplicate(room=room, user=user, phone=phone, email=email)
        if duplicate:
            return duplicate

        viewing_request = ViewingRequest.objects.create(
            user=user,
            room=room,
            full_name=full_name,
            phone=phone,
            email=email,
            status=ViewingRequest.Status.NEW,
            estimated_commission_amount=room.estimated_commission_amount,
            actual_commission_amount=0,
        )
        logger.info("Viewing request converted from contact: id=%s user_id=%s room_id=%s", viewing_request.id, user.id, room.id)
        return viewing_request

    @staticmethod
    @transaction.atomic
    def confirm_moved_in(*, viewing_request_id, actor):
        viewing_request = (
            ViewingRequest.objects.select_for_update()
            .select_related("room", "user")
            .get(pk=viewing_request_id)
        )

        if viewing_request.status == ViewingRequest.Status.CONVERTED or not ViewingRequest.can_transition(
            viewing_request.status,
            ViewingRequest.Status.CONVERTED,
        ):
            raise ValidationError({"status": f"Lead in {viewing_request.status} status cannot be converted."})
        if viewing_request.is_commission_counted:
            raise ValidationError({"is_commission_counted": "Commission has already been counted for this lead."})

        room = Room.objects.select_for_update().get(pk=viewing_request.room_id)
        if room.status != Room.Status.PUBLISHED or RoomLease.objects.filter(
            room=room,
            status=RoomLease.Status.ACTIVE,
        ).exists():
            raise ValidationError({"room": "Room is no longer available for move-in."})

        competing_leads = list(
            ViewingRequest.objects.select_for_update()
            .filter(room=room, status__in=ViewingRequest.ACTIVE_STATUSES)
            .exclude(pk=viewing_request.pk)
        )
        if competing_leads:
            competing_ids = [lead.id for lead in competing_leads]
            ViewingRequest.objects.filter(id__in=competing_ids).update(status=ViewingRequest.Status.CANCELLED)
            ViewingRequestActivity.objects.bulk_create(
                [
                    ViewingRequestActivity(
                        viewing_request=lead,
                        actor=actor,
                        action="AUTO_CANCELLED",
                        note="Room was rented by another lead.",
                    )
                    for lead in competing_leads
                ]
            )
            audit_event(
                "viewing_request.competing_leads_cancelled",
                actor=actor,
                target=viewing_request,
                metadata={"room_id": room.id, "lead_ids": competing_ids},
            )

        viewing_request.status = ViewingRequest.Status.CONVERTED
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
        room.status = Room.Status.RENTED
        room.save(update_fields=["status", "updated_at"])
        RoomLease.objects.get_or_create(
            viewing_request=viewing_request,
            defaults={
                "room": room,
                "tenant": viewing_request.user,
                "move_in_at": viewing_request.moved_in_at,
            },
        )

        from apps.commissions.models import CommissionPayout

        CommissionPayout.objects.get_or_create(
            viewing_request=viewing_request,
            defaults={"amount": viewing_request.actual_commission_amount},
        )
        ViewingRequestActivity.objects.create(
            viewing_request=viewing_request,
            actor=actor,
            action="CONVERTED",
            note="Lead converted to tenant.",
        )
        audit_event(
            "viewing_request.converted",
            actor=actor,
            target=viewing_request,
            metadata={"room_id": viewing_request.room_id, "commission": str(viewing_request.actual_commission_amount)},
        )
        logger.info(
            "Lead converted: viewing_request_id=%s actor_id=%s commission=%s",
            viewing_request.id,
            actor.id,
            viewing_request.actual_commission_amount,
        )
        return viewing_request

    @staticmethod
    @transaction.atomic
    def confirm_appointment(*, viewing_request_id, actor, appointment_date, appointment_time_slot, note=""):
        viewing_request = ViewingRequest.objects.select_for_update().get(pk=viewing_request_id)
        if viewing_request.status != ViewingRequest.Status.SCHEDULED and not ViewingRequest.can_transition(
            viewing_request.status,
            ViewingRequest.Status.SCHEDULED,
        ):
            raise ValidationError({"status": f"Lead in {viewing_request.status} status cannot be scheduled."})
        viewing_request.confirmed_at = timezone.now()
        viewing_request.appointment_date = appointment_date
        viewing_request.appointment_time_slot = appointment_time_slot
        viewing_request.status = ViewingRequest.Status.SCHEDULED
        viewing_request.save(update_fields=["confirmed_at", "appointment_date", "appointment_time_slot", "status", "updated_at"])
        ViewingRequestActivity.objects.create(
            viewing_request=viewing_request,
            actor=actor,
            action="SCHEDULE_APPOINTMENT",
            note=note,
        )
        audit_event(
            "viewing_request.scheduled",
            actor=actor,
            target=viewing_request,
            metadata={"appointment_date": appointment_date.isoformat(), "appointment_time_slot": appointment_time_slot},
        )
        return viewing_request

    @staticmethod
    @transaction.atomic
    def move_out(*, viewing_request_id, actor, note=""):
        viewing_request = ViewingRequest.objects.select_for_update().select_related("room").get(pk=viewing_request_id)
        lease = RoomLease.objects.select_for_update().filter(
            viewing_request=viewing_request,
            status=RoomLease.Status.ACTIVE,
        ).first()
        if lease is None:
            raise ValidationError({"lease": "No active lease found for this lead."})
        now = timezone.now()
        lease.status = RoomLease.Status.ENDED
        lease.move_out_at = now
        lease.note = note
        lease.save(update_fields=["status", "move_out_at", "note", "updated_at"])
        viewing_request.room.status = Room.Status.PUBLISHED
        viewing_request.room.save(update_fields=["status", "updated_at"])
        ViewingRequestActivity.objects.create(
            viewing_request=viewing_request,
            actor=actor,
            action="MOVE_OUT",
            note=note,
        )
        audit_event(
            "viewing_request.move_out",
            actor=actor,
            target=viewing_request,
            metadata={"room_id": viewing_request.room_id},
        )
        return lease
