from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Count, Exists, OuterRef
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.common.models import AuditLog
from apps.common.permissions import IsAdmin, IsLandlord
from apps.common.responses import success_response
from apps.common.audit import audit_event
from apps.common.cache_utils import (
    PublicResponseCacheMixin,
    ROOM_DETAIL_CACHE_NAMESPACE,
    ROOM_FILTER_CACHE_NAMESPACE,
    ROOM_LIST_CACHE_NAMESPACE,
    get_or_set_versioned,
)
from apps.common.viewsets import StandardResponseModelViewSetMixin, StandardResponseReadOnlyMixin
from apps.locations.models import Amenity, AreaRange, City, Ward
from apps.locations.serializers import AmenitySerializer, AreaRangeSerializer, CitySerializer, WardSerializer
from apps.locations.services import ActiveFlagDeleteMixin
from apps.rooms.filters import PublicRoomFilter, RoomFilter
from apps.rooms.models import DepositType, Room, RoomSubtype
from apps.rooms.selectors import admin_rooms_queryset, public_room_details_queryset, public_rooms_queryset
from apps.rooms.serializers import (
    AdminRoomImageWriteSerializer,
    AdminRoomSerializer,
    DepositTypeSerializer,
    LandlordConfirmRentalSerializer,
    LandlordRentalCandidateSerializer,
    LandlordRoomImageWriteSerializer,
    LandlordRoomSerializer,
    PublicRoomDetailSerializer,
    PublicRoomListSerializer,
    RoomFiltersSerializer,
    RoomImageSerializer,
    RoomSubtypeSerializer,
)
from apps.rooms.services import RoomService
from apps.viewing_requests.models import RoomLease, ViewingRequest
from apps.viewing_requests.services import ViewingRequestService


class RoomHistoryConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Phòng đã có lịch sử xem hoặc thuê. Hãy chuyển phòng sang trạng thái lưu trữ."


class LandlordRoomLocked(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Phòng đang ở trạng thái khóa. Hãy đưa phòng về bản nháp trước khi chỉnh sửa hoặc xóa."


@method_decorator(cache_control(public=True, max_age=30), name="list")
@method_decorator(cache_control(public=True, max_age=30), name="retrieve")
class PublicRoomViewSet(PublicResponseCacheMixin, StandardResponseReadOnlyMixin, ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = PublicRoomFilter
    ordering_fields = ("price", "actual_area", "created_at")
    public_cache_namespaces = {
        "list": ROOM_LIST_CACHE_NAMESPACE,
        "retrieve": ROOM_DETAIL_CACHE_NAMESPACE,
    }
    public_cache_timeouts = {"list": 60, "retrieve": 120}
    public_cache_query_parameters = {
        "amenities",
        "area_range",
        "city",
        "hero_eligible",
        "max_price",
        "min_price",
        "ordering",
        "page",
        "page_size",
        "room_subtype",
        "room_type",
        "search",
        "status",
        "ward",
    }

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
        def serialize_filters():
            return {
                "cities": CitySerializer(City.objects.active(), many=True).data,
                "wards": WardSerializer(Ward.objects.active().select_related("city"), many=True).data,
                "amenities": AmenitySerializer(Amenity.objects.active(), many=True).data,
                "area_ranges": AreaRangeSerializer(AreaRange.objects.active(), many=True).data,
                "deposit_types": DepositTypeSerializer(DepositType.objects.active(), many=True).data,
                "room_types": [{"value": value, "label": label} for value, label in Room.RoomType.choices],
                "room_subtypes": RoomSubtypeSerializer(RoomSubtype.objects.active(), many=True).data,
                "statuses": [
                    {"value": Room.Status.PUBLISHED, "label": "Còn trống"},
                ],
            }

        data, hit = get_or_set_versioned(
            ROOM_FILTER_CACHE_NAMESPACE,
            request.path,
            serialize_filters,
            timeout=60 * 30,
        )
        response = success_response(data=data)
        response["X-Cache"] = "HIT" if hit else "MISS"
        return response


class AdminRoomViewSet(StandardResponseModelViewSetMixin, ModelViewSet):
    serializer_class = AdminRoomSerializer
    permission_classes = [IsAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_class = RoomFilter
    search_fields = ("title", "room_code", "address", "building_code", "description", "internal_note")
    ordering_fields = ("price", "actual_area", "created_at", "estimated_commission_amount")

    def get_queryset(self):
        return admin_rooms_queryset()

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
        with transaction.atomic():
            room = Room.objects.select_for_update().get(pk=instance.pk)
            if room.viewing_requests.exists() or room.leases.exists():
                raise RoomHistoryConflict()
            audit_event(
                "room.deleted",
                request=self.request,
                target=room,
                metadata={"status": room.status},
            )
            try:
                room.delete()
            except ProtectedError as exc:
                raise RoomHistoryConflict() from exc

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
            serializer = AdminRoomImageWriteSerializer(image, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            changed_fields = sorted(serializer.validated_data)
            image = serializer.save()
            audit_event(
                "room.image_updated",
                request=request,
                target=room,
                metadata={"image_id": image.id, "fields": changed_fields},
            )
            return success_response(data=RoomImageSerializer(image, context=self.get_serializer_context()).data)
        image.delete()
        audit_event("room.image_deleted", request=request, target=room, metadata={"image_id": image_id})
        return success_response(message="Image deleted successfully.")


class LandlordRoomViewSet(StandardResponseReadOnlyMixin, ModelViewSet):
    CONTENT_EDITABLE_STATUSES = {Room.Status.DRAFT, Room.Status.HIDDEN}
    DELETABLE_STATUSES = {Room.Status.DRAFT, Room.Status.HIDDEN, Room.Status.ARCHIVED}
    serializer_class = LandlordRoomSerializer
    permission_classes = [IsLandlord]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filterset_class = RoomFilter
    search_fields = ("title", "room_code", "address", "description")
    ordering_fields = ("price", "actual_area", "created_at", "updated_at")
    success_create_message = "Room draft created successfully."
    success_update_message = "Room updated successfully."
    success_delete_message = "Room deleted successfully."

    def get_throttles(self):
        self.throttle_scope = (
            "landlord_room_write"
            if self.action in {"create", "update", "partial_update", "destroy", "image_detail", "confirm_rental"}
            else None
        )
        return super().get_throttles()

    def get_queryset(self):
        return admin_rooms_queryset().filter(created_by=self.request.user).annotate(
            has_viewing_history=Exists(ViewingRequest.objects.filter(room_id=OuterRef("pk"))),
            has_lease_history=Exists(RoomLease.objects.filter(room_id=OuterRef("pk"))),
        )

    @action(detail=False, methods=["get"])
    def summary(self, request):
        status_counts = {
            row["status"]: row["count"]
            for row in self.get_queryset().order_by().values("status").annotate(count=Count("id"))
        }
        data = {
            "total": sum(status_counts.values()),
            "draft": status_counts.get(Room.Status.DRAFT, 0),
            "pending_review": status_counts.get(Room.Status.PENDING_REVIEW, 0),
            "published": status_counts.get(Room.Status.PUBLISHED, 0),
            "rented": status_counts.get(Room.Status.RENTED, 0),
            "hidden": status_counts.get(Room.Status.HIDDEN, 0),
            "archived": status_counts.get(Room.Status.ARCHIVED, 0),
        }
        return success_response(data=data)

    @extend_schema(responses=LandlordRentalCandidateSerializer(many=True))
    @action(detail=True, methods=["get"], url_path="rental-candidates")
    def rental_candidates(self, request, pk=None):
        room = self.get_object()
        candidates = ViewingRequest.objects.filter(
            room=room,
            status__in=ViewingRequest.ACTIVE_STATUSES,
        ).order_by("-created_at")
        return success_response(
            data=LandlordRentalCandidateSerializer(candidates, many=True).data,
        )

    @transaction.atomic
    @extend_schema(request=LandlordConfirmRentalSerializer, responses=LandlordRoomSerializer)
    @action(detail=True, methods=["post"], url_path="confirm-rental")
    def confirm_rental(self, request, pk=None):
        room = self.get_object()
        serializer = LandlordConfirmRentalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        viewing_request = get_object_or_404(
            ViewingRequest.objects.only("id", "room_id"),
            pk=serializer.validated_data["viewing_request_id"],
            room=room,
        )
        ViewingRequestService.confirm_moved_in(
            viewing_request_id=viewing_request.id,
            actor=request.user,
        )
        room.refresh_from_db()
        audit_event(
            "landlord.room_rented",
            request=request,
            target=room,
            metadata={"viewing_request_id": viewing_request.id},
        )
        return success_response(
            data=LandlordRoomSerializer(room, context=self.get_serializer_context()).data,
            message="Rental confirmed successfully.",
        )

    def handle_exception(self, exc):
        if isinstance(exc, ValidationError) and self.action in {"create", "update", "partial_update"}:
            self._audit_upload_rejected()
        return super().handle_exception(exc)

    def _request_image_urls(self):
        if hasattr(self.request.data, "getlist"):
            return [value for value in self.request.data.getlist("image_urls") if value]
        raw_value = self.request.data.get("image_urls", [])
        if raw_value is None:
            return []
        if isinstance(raw_value, str):
            return [raw_value] if raw_value else []
        return [value for value in raw_value if value]

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

        audit_event(
            "landlord.room_upload_rejected",
            request=self.request,
            target=target,
            status=AuditLog.Status.FAILURE,
            metadata={
                "fields": fields,
                "uploaded_image_count": len(uploaded_images),
                "image_url_count": len(image_urls),
                "thumbnail_present": thumbnail_present,
            },
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        RoomService.create_room(serializer=serializer, user=request.user, request=request)
        audit_event(
            "landlord.room_created",
            request=request,
            target=serializer.instance,
            metadata={"status": serializer.instance.status},
        )
        headers = self.get_success_headers(serializer.data)
        return Response(
            {"success": True, "message": self.success_create_message, "data": serializer.data},
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        locked_room = self.get_queryset().select_for_update().get(pk=self.get_object().pk)
        serializer = self.get_serializer(locked_room, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        changed_fields = sorted(serializer.validated_data)
        RoomService.update_room(serializer=serializer, request=request)
        audit_event(
            "landlord.room_updated",
            request=request,
            target=serializer.instance,
            metadata={"fields": changed_fields},
        )
        return Response({"success": True, "message": self.success_update_message, "data": serializer.data})

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        room = self.get_queryset().select_for_update().get(pk=self.get_object().pk)
        if room.status not in self.DELETABLE_STATUSES:
            raise LandlordRoomLocked()
        if room.viewing_requests.exists() or room.leases.exists():
            raise RoomHistoryConflict()
        audit_event(
            "landlord.room_deleted",
            request=request,
            target=room,
            metadata={"status": room.status},
        )
        try:
            room.delete()
        except ProtectedError as exc:
            raise RoomHistoryConflict() from exc
        return Response({"success": True, "message": self.success_delete_message, "data": {}}, status=status.HTTP_200_OK)

    @extend_schema(
        parameters=[
            OpenApiParameter("image_id", OpenApiTypes.INT, OpenApiParameter.PATH),
        ]
    )
    @action(detail=True, methods=["delete", "patch"], url_path="images/(?P<image_id>[^/.]+)")
    def image_detail(self, request, pk=None, image_id=None):
        room = self.get_object()
        if room.status not in self.CONTENT_EDITABLE_STATUSES:
            raise LandlordRoomLocked()
        image = get_object_or_404(room.images.all(), pk=image_id)
        if request.method == "PATCH":
            serializer = LandlordRoomImageWriteSerializer(image, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            changed_fields = sorted(serializer.validated_data)
            image = serializer.save()
            audit_event(
                "landlord.room_image_updated",
                request=request,
                target=room,
                metadata={"image_id": image.id, "fields": changed_fields},
            )
            return success_response(data=RoomImageSerializer(image, context=self.get_serializer_context()).data)
        image.delete()
        audit_event("landlord.room_image_deleted", request=request, target=room, metadata={"image_id": image_id})
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


class AdminRoomSubtypeViewSet(StandardResponseModelViewSetMixin, ActiveFlagDeleteMixin, ModelViewSet):
    queryset = RoomSubtype.objects.all()
    serializer_class = RoomSubtypeSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("parent_type", "is_active")
    search_fields = ("name",)
    ordering_fields = ("parent_type", "name", "created_at")

    def perform_create(self, serializer):
        subtype = serializer.save()
        audit_event(
            "room_subtype.created",
            request=self.request,
            target=subtype,
            metadata={"parent_type": subtype.parent_type, "name": subtype.name, "is_active": subtype.is_active},
        )

    def perform_update(self, serializer):
        previous = {
            "parent_type": serializer.instance.parent_type,
            "name": serializer.instance.name,
            "is_active": serializer.instance.is_active,
        }
        subtype = serializer.save()
        audit_event(
            "room_subtype.updated",
            request=self.request,
            target=subtype,
            metadata={
                "from": previous,
                "to": {"parent_type": subtype.parent_type, "name": subtype.name, "is_active": subtype.is_active},
            },
        )

    def perform_destroy(self, instance):
        was_used = instance.rooms.exists()
        instance.delete()
        audit_event(
            "room_subtype.deactivated" if was_used else "room_subtype.deleted",
            request=self.request,
            target=instance,
            metadata={"parent_type": instance.parent_type, "name": instance.name, "was_used": was_used},
        )
