from rest_framework.viewsets import ModelViewSet

from apps.common.permissions import IsAdmin
from apps.common.viewsets import StandardResponseModelViewSetMixin
from apps.locations.models import Amenity, AreaRange, City, Ward
from apps.locations.serializers import AmenitySerializer, AreaRangeSerializer, CitySerializer, WardSerializer
from apps.locations.services import ActiveFlagDeleteMixin


class AdminCityViewSet(StandardResponseModelViewSetMixin, ActiveFlagDeleteMixin, ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [IsAdmin]
    search_fields = ("name", "slug")
    ordering_fields = ("name", "created_at")


class AdminWardViewSet(StandardResponseModelViewSetMixin, ActiveFlagDeleteMixin, ModelViewSet):
    queryset = Ward.objects.select_related("city").all()
    serializer_class = WardSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("city", "is_active")
    search_fields = ("name", "slug", "city__name")
    ordering_fields = ("name", "created_at")


class AdminAmenityViewSet(StandardResponseModelViewSetMixin, ActiveFlagDeleteMixin, ModelViewSet):
    queryset = Amenity.objects.all()
    serializer_class = AmenitySerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("is_active",)
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")


class AdminAreaRangeViewSet(StandardResponseModelViewSetMixin, ActiveFlagDeleteMixin, ModelViewSet):
    queryset = AreaRange.objects.all()
    serializer_class = AreaRangeSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("is_active",)
    search_fields = ("name",)
    ordering_fields = ("min_area", "created_at")
