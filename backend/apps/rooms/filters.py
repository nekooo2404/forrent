import django_filters

from apps.rooms.models import Room


class RoomFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    amenities = django_filters.BaseInFilter(field_name="amenities__id", lookup_expr="in")

    class Meta:
        model = Room
        fields = {
            "city": ["exact"],
            "ward": ["exact"],
            "room_type": ["exact"],
            "area_range": ["exact"],
            "status": ["exact"],
        }
