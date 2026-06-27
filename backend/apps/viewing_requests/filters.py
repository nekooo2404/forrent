import django_filters

from apps.viewing_requests.models import ViewingRequest


class ViewingRequestAdminFilter(django_filters.FilterSet):
    city = django_filters.NumberFilter(field_name="room__city_id")
    ward = django_filters.NumberFilter(field_name="room__ward_id")
    date_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = ViewingRequest
        fields = ("status", "room", "city", "ward", "date_from", "date_to")
