from django.db.models import Prefetch

from apps.locations.models import Amenity
from apps.rooms.models import Room


def public_rooms_queryset():
    return (
        Room.objects.public()
        .select_related("city", "ward", "area_range", "deposit_type")
        .prefetch_related(
            Prefetch("amenities", queryset=Amenity.objects.active()),
        )
        .distinct()
    )


def public_room_details_queryset():
    return public_rooms_queryset().prefetch_related("images")


def admin_rooms_queryset():
    return (
        Room.objects.select_related("city", "ward", "area_range", "created_by", "deposit_type")
        .prefetch_related("amenities", "images")
        .distinct()
    )
