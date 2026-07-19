import django_filters

from apps.rooms.models import Room
from apps.rooms.public_copy import normalize_search_text


class RoomFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    amenities = django_filters.BaseInFilter(field_name="amenities__id", lookup_expr="in")
    status = django_filters.CharFilter(method="filter_status")

    def filter_status(self, queryset, _name, value):
        status_aliases = {
            "AVAILABLE": Room.Status.PUBLISHED,
            "UNAVAILABLE": Room.Status.RENTED,
        }
        return queryset.filter(status=status_aliases.get(value, value))

    class Meta:
        model = Room
        fields = {
            "city": ["exact"],
            "ward": ["exact"],
            "room_type": ["exact"],
            "room_subtype": ["exact"],
            "area_range": ["exact"],
            "status": ["exact"],
            "hero_eligible": ["exact"],
        }


class PublicRoomFilter(RoomFilter):
    search = django_filters.CharFilter(method="filter_search")

    def filter_search(self, queryset, _name, value):
        tokens = normalize_search_text(value).split()
        for token in tokens:
            queryset = queryset.filter(search_document__icontains=token)
        return queryset
