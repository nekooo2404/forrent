from django.db import transaction


class RoomService:
    @staticmethod
    @transaction.atomic
    def create_room(*, serializer, user):
        return serializer.save(created_by=user)

    @staticmethod
    @transaction.atomic
    def update_room(*, serializer):
        return serializer.save()
