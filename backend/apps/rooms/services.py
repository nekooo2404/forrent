from django.db import transaction

from apps.common.audit import audit_event


class RoomService:
    @staticmethod
    @transaction.atomic
    def create_room(*, serializer, user, request=None):
        room = serializer.save(created_by=user)
        audit_event(
            "room.created",
            request=request,
            actor=user,
            target=room,
            metadata={"status": room.status},
        )
        return room

    @staticmethod
    @transaction.atomic
    def update_room(*, serializer, request=None):
        previous_status = serializer.instance.status
        previous_deposit_type_id = serializer.instance.deposit_type_id
        room = serializer.save()
        if room.status != previous_status:
            audit_event(
                "room.status_changed",
                request=request,
                target=room,
                metadata={"from": previous_status, "to": room.status},
            )
        if room.deposit_type_id != previous_deposit_type_id:
            audit_event(
                "room.deposit_type_changed",
                request=request,
                target=room,
                metadata={"from": previous_deposit_type_id, "to": room.deposit_type_id},
            )
        return room
