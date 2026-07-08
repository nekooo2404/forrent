from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.common.permissions import IsAdmin
from apps.common.responses import success_response
from apps.common.viewsets import StandardResponseModelViewSetMixin, StandardResponseReadOnlyMixin
from apps.locations.models import Amenity, AreaRange, City, Ward
from apps.locations.serializers import AmenitySerializer, AreaRangeSerializer, CitySerializer, WardSerializer
from apps.locations.services import ActiveFlagDeleteMixin
from apps.rooms.filters import RoomFilter
from apps.rooms.models import DepositType, Room
from apps.rooms.selectors import admin_rooms_queryset, public_room_details_queryset, public_rooms_queryset
from apps.rooms.serializers import (
    AdminRoomSerializer,
    DepositTypeSerializer,
    PublicRoomDetailSerializer,
    PublicRoomListSerializer,
    RoomFiltersSerializer,
    RoomImageSerializer,
)
from apps.rooms.services import RoomService


@method_decorator(cache_control(public=True, max_age=30), name="list")
@method_decorator(cache_control(public=True, max_age=30), name="retrieve")
class PublicRoomViewSet(StandardResponseReadOnlyMixin, ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = RoomFilter
    search_fields = ("title", "address", "description")
    ordering_fields = ("price", "actual_area", "created_at")

    def get_queryset(self):
        if self.action == "retrieve":
            return public_room_details_queryset()
        return public_rooms_queryset()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PublicRoomDetailSerializer
        return PublicRoomListSerializer


class PublicRoomFiltersAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = RoomFiltersSerializer

    @extend_schema(responses=RoomFiltersSerializer)
    @method_decorator(cache_control(public=True, max_age=1800))
    def get(self, request):
        cache_key = "public-room-filters"
        data = cache.get(cache_key)
        if data is None:
            data = {
                "cities": CitySerializer(City.objects.active(), many=True).data,
                "wards": WardSerializer(Ward.objects.active().select_related("city"), many=True).data,
                "amenities": AmenitySerializer(Amenity.objects.active(), many=True).data,
                "area_ranges": AreaRangeSerializer(AreaRange.objects.active(), many=True).data,
                "deposit_types": DepositTypeSerializer(DepositType.objects.active(), many=True).data,
                "room_types": [{"value": value, "label": label} for value, label in Room.RoomType.choices],
                "statuses": [
                    {"value": Room.Status.AVAILABLE, "label": "Còn trống"},
                ],
            }
            cache.set(cache_key, data, 60 * 10)
        return success_response(data=data)


class AdminRoomViewSet(StandardResponseModelViewSetMixin, ModelViewSet):
    serializer_class = AdminRoomSerializer
    permission_classes = [IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_class = RoomFilter
    search_fields = ("title", "address", "description", "internal_note")
    ordering_fields = ("price", "actual_area", "created_at", "estimated_commission_amount")

    def get_queryset(self):
        return admin_rooms_queryset()

    def perform_create(self, serializer):
        RoomService.create_room(serializer=serializer, user=self.request.user)

    def perform_update(self, serializer):
        RoomService.update_room(serializer=serializer)

    @extend_schema(
        parameters=[
            OpenApiParameter("image_id", OpenApiTypes.INT, OpenApiParameter.PATH),
        ]
    )
    @action(detail=True, methods=["delete", "patch"], url_path="images/(?P<image_id>[^/.]+)")
    def image_detail(self, request, pk=None, image_id=None):
        room = self.get_object()
        image = room.images.get(pk=image_id)
        if request.method == "PATCH":
            image.sort_order = request.data.get("sort_order", image.sort_order)
            image.save(update_fields=["sort_order"])
            return success_response(data=RoomImageSerializer(image, context=self.get_serializer_context()).data)
        image.delete()
        return success_response(message="Image deleted successfully.")


class AdminDepositTypeViewSet(StandardResponseModelViewSetMixin, ActiveFlagDeleteMixin, ModelViewSet):
    queryset = DepositType.objects.all()
    serializer_class = DepositTypeSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("is_active",)
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")
