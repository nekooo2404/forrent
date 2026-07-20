import django_filters
from django.db.models import Count, Q

from apps.rooms.models import Room
from apps.rooms.public_copy import normalize_search_text


class NumberInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    pass


class RoomFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    amenities = NumberInFilter(method="filter_amenities")
    status = django_filters.CharFilter(method="filter_status")

    def filter_status(self, queryset, _name, value):
        status_aliases = {
            "AVAILABLE": Room.Status.PUBLISHED,
            "UNAVAILABLE": Room.Status.RENTED,
        }
        return queryset.filter(status=status_aliases.get(value, value))

    def filter_amenities(self, queryset, _name, value):
        amenity_ids = {int(amenity_id) for amenity_id in value or []}
        if not amenity_ids:
            return queryset

        return queryset.annotate(
            matched_selected_amenities=Count(
                "amenities",
                filter=Q(amenities__id__in=amenity_ids),
                distinct=True,
            ),
        ).filter(matched_selected_amenities=len(amenity_ids)).order_by("-created_at", "-id")

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
