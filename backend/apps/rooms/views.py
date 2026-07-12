from urllib.parse import urlparse

from django.core.cache import cache
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.common.models import AuditLog
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response
from apps.common.audit import audit_event
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
                    {"value": Room.Status.PUBLISHED, "label": "Còn trống"},
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
        queryset = admin_rooms_queryset()
        if self.action in {"update", "partial_update", "destroy"}:
            queryset = queryset.select_for_update()
        return queryset

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    def handle_exception(self, exc):
        if isinstance(exc, ValidationError) and self.action in {"create", "update", "partial_update"}:
            self._audit_upload_rejected()
        return super().handle_exception(exc)

    def _audit_upload_rejected(self):
        uploaded_images = self.request.FILES.getlist("uploaded_images")
        thumbnail_present = "thumbnail" in self.request.FILES
        image_urls = self._request_image_urls()
        fields = []
        if uploaded_images:
            fields.append("uploaded_images")
        if image_urls:
            fields.append("image_urls")
        if thumbnail_present:
            fields.append("thumbnail")
        if not fields:
            return

        target = None
        if self.action in {"update", "partial_update"}:
            try:
                target = self.get_object()
            except Exception:
                target = None

        image_url_hosts = []
        for image_url in image_urls[:5]:
            hostname = urlparse(str(image_url)).hostname
            if hostname:
                image_url_hosts.append(hostname)

        audit_event(
            "room.upload_rejected",
            request=self.request,
            target=target,
            status=AuditLog.Status.FAILURE,
            metadata={
                "fields": fields,
                "uploaded_image_count": len(uploaded_images),
                "image_url_count": len(image_urls),
                "thumbnail_present": thumbnail_present,
                "image_url_hosts": image_url_hosts,
            },
        )

    def _request_image_urls(self):
        if hasattr(self.request.data, "getlist"):
            return [value for value in self.request.data.getlist("image_urls") if value]
        raw_value = self.request.data.get("image_urls", [])
        if raw_value is None:
            return []
        if isinstance(raw_value, str):
            return [raw_value] if raw_value else []
        return [value for value in raw_value if value]

    def perform_create(self, serializer):
        RoomService.create_room(serializer=serializer, user=self.request.user, request=self.request)

    def perform_update(self, serializer):
        RoomService.update_room(serializer=serializer, request=self.request)

    def perform_destroy(self, instance):
        audit_event(
            "room.deleted",
            request=self.request,
            target=instance,
            metadata={"status": instance.status},
        )
        instance.delete()

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
            audit_event("room.image_reordered", request=request, target=room, metadata={"image_id": image.id})
            return success_response(data=RoomImageSerializer(image, context=self.get_serializer_context()).data)
        image.delete()
        audit_event("room.image_deleted", request=request, target=room, metadata={"image_id": image_id})
        return success_response(message="Image deleted successfully.")


class AdminDepositTypeViewSet(StandardResponseModelViewSetMixin, ActiveFlagDeleteMixin, ModelViewSet):
    queryset = DepositType.objects.all()
    serializer_class = DepositTypeSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("is_active",)
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")

    def perform_create(self, serializer):
        deposit_type = serializer.save()
        audit_event(
            "deposit_type.created",
            request=self.request,
            target=deposit_type,
            metadata={"name": deposit_type.name, "is_active": deposit_type.is_active},
        )

    def perform_update(self, serializer):
        previous = {
            "name": serializer.instance.name,
            "is_active": serializer.instance.is_active,
        }
        deposit_type = serializer.save()
        audit_event(
            "deposit_type.updated",
            request=self.request,
            target=deposit_type,
            metadata={
                "from": previous,
                "to": {"name": deposit_type.name, "is_active": deposit_type.is_active},
            },
        )

    def perform_destroy(self, instance):
        was_used = instance.rooms.exists()
        audit_event(
            "deposit_type.deactivated" if was_used else "deposit_type.deleted",
            request=self.request,
            target=instance,
            metadata={"name": instance.name, "was_used": was_used},
        )
        instance.delete()
