from drf_spectacular.utils import extend_schema
from rest_framework import mixins
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from django.utils import timezone

from apps.common.permissions import IsAdminOrSaler, IsLandlord, IsTenant
from apps.common.responses import success_response
from apps.common.viewsets import StandardResponseUpdateMixin
from apps.viewing_requests.filters import ViewingRequestAdminFilter
from apps.viewing_requests.selectors import admin_viewing_requests_queryset, user_viewing_requests_queryset
from apps.viewing_requests.models import LandlordNotification, ViewingRequest
from apps.viewing_requests.serializers import (
    AdminViewingRequestSerializer,
    AppointmentConfirmSerializer,
    BulkViewingRequestUpdateSerializer,
    ConfirmMovedInResponseSerializer,
    LandlordNotificationSerializer,
    LandlordViewingRequestSerializer,
    MoveOutSerializer,
    MyViewingRequestSerializer,
    ViewingRequestCreateResponseSerializer,
    ViewingRequestCreateSerializer,
)
from apps.viewing_requests.services import ViewingRequestService


class ViewingRequestCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, IsTenant]
    throttle_scope = "viewing_request"

    @extend_schema(request=ViewingRequestCreateSerializer, responses=ViewingRequestCreateResponseSerializer)
    def post(self, request):
        serializer = ViewingRequestCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        viewing_request = serializer.save()
        return success_response(
            data=ViewingRequestCreateResponseSerializer(viewing_request).data,
            message="Ban da xac nhan xem phong thanh cong. Nhan vien tu van se lien he voi ban som.",
            status_code=status.HTTP_201_CREATED,
        )


class MyViewingRequestListAPIView(ListAPIView):
    serializer_class = MyViewingRequestSerializer
    permission_classes = [IsAuthenticated, IsTenant]
    queryset = ViewingRequest.objects.none()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        return user_viewing_requests_queryset(self.request.user)


class AdminViewingRequestViewSet(
    StandardResponseUpdateMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    serializer_class = AdminViewingRequestSerializer
    permission_classes = [IsAdminOrSaler]
    filterset_class = ViewingRequestAdminFilter
    search_fields = ("full_name", "email", "phone", "room__title")
    ordering_fields = ("created_at", "confirmed_at", "appointment_date", "moved_in_at", "estimated_commission_amount", "actual_commission_amount")
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        return admin_viewing_requests_queryset()

    @extend_schema(responses=ConfirmMovedInResponseSerializer)
    @action(detail=True, methods=["post"], url_path="confirm-moved-in")
    def confirm_moved_in(self, request, pk=None):
        viewing_request = ViewingRequestService.confirm_moved_in(
            viewing_request_id=pk,
            actor=request.user,
        )
        return success_response(
            data={
                "viewing_request_id": viewing_request.id,
                "actual_commission_amount": viewing_request.actual_commission_amount,
                "status": viewing_request.status,
            },
            message="Moved-in confirmation recorded successfully.",
        )

    @extend_schema(request=AppointmentConfirmSerializer, responses=AdminViewingRequestSerializer)
    @action(detail=True, methods=["post"], url_path="confirm-appointment")
    def confirm_appointment(self, request, pk=None):
        serializer = AppointmentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        viewing_request = ViewingRequestService.confirm_appointment(
            viewing_request_id=pk,
            actor=request.user,
            **serializer.validated_data,
        )
        return success_response(
            data=AdminViewingRequestSerializer(viewing_request, context={"request": request}).data,
            message="Appointment confirmed successfully.",
        )

    @extend_schema(request=MoveOutSerializer)
    @action(detail=True, methods=["post"], url_path="move-out")
    def move_out(self, request, pk=None):
        serializer = MoveOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lease = ViewingRequestService.move_out(
            viewing_request_id=pk,
            actor=request.user,
            note=serializer.validated_data.get("note", ""),
        )
        return success_response(
            data={"lease_id": lease.id, "status": lease.status},
            message="Move-out recorded successfully.",
        )

    @extend_schema(request=BulkViewingRequestUpdateSerializer)
    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        serializer = BulkViewingRequestUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data.pop("ids")
        updates = serializer.validated_data
        updated_count = ViewingRequestService.bulk_update(
            ids=ids,
            updates=updates,
            actor=request.user,
            request=request,
        )
        return success_response(data={"updated_count": updated_count}, message="Leads updated successfully.")


class LandlordViewingRequestViewSet(
    StandardResponseUpdateMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    """Owner-scoped lead workflow without admin assignment or finance controls."""

    serializer_class = LandlordViewingRequestSerializer
    permission_classes = [IsLandlord]
    filterset_class = ViewingRequestAdminFilter
    search_fields = ("full_name", "email", "phone", "room__title", "room__room_code")
    ordering_fields = ("created_at", "confirmed_at", "appointment_date", "updated_at")
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_throttles(self):
        self.throttle_scope = (
            "landlord_workflow_write"
            if self.action in {"partial_update", "confirm_appointment"}
            else None
        )
        return super().get_throttles()

    def get_queryset(self):
        return admin_viewing_requests_queryset().filter(room__created_by=self.request.user)

    def _lock_instance_for_update(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is not None:
            self.get_queryset().select_for_update().filter(**{self.lookup_field: lookup_value}).first()

    @extend_schema(request=AppointmentConfirmSerializer, responses=LandlordViewingRequestSerializer)
    @action(detail=True, methods=["post"], url_path="confirm-appointment")
    def confirm_appointment(self, request, pk=None):
        owned_request = self.get_object()
        serializer = AppointmentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        viewing_request = ViewingRequestService.confirm_appointment(
            viewing_request_id=owned_request.pk,
            actor=request.user,
            **serializer.validated_data,
        )
        return success_response(
            data=LandlordViewingRequestSerializer(viewing_request, context={"request": request}).data,
            message="Appointment confirmed successfully.",
        )


class LandlordNotificationViewSet(mixins.RetrieveModelMixin, GenericViewSet):
    serializer_class = LandlordNotificationSerializer
    permission_classes = [IsLandlord]
    http_method_names = ["get", "post", "head", "options"]

    def get_throttles(self):
        self.throttle_scope = (
            "landlord_workflow_write"
            if self.action in {"mark_read", "mark_all_read"}
            else None
        )
        return super().get_throttles()

    def get_queryset(self):
        return (
            LandlordNotification.objects.filter(recipient=self.request.user)
            .select_related("viewing_request__room")
            .order_by("-created_at")
        )

    def list(self, request, *args, **kwargs):
        try:
            limit = min(max(int(request.query_params.get("limit", 8)), 1), 20)
        except (TypeError, ValueError):
            limit = 8
        queryset = self.get_queryset()
        notifications = list(queryset[:limit])
        return success_response(
            data={
                "unread_count": queryset.filter(read_at__isnull=True).count(),
                "results": self.get_serializer(notifications, many=True).data,
            },
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at", "updated_at"])
        return success_response(data=self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        now = timezone.now()
        updated_count = self.get_queryset().filter(read_at__isnull=True).update(
            read_at=now,
            updated_at=now,
        )
        return success_response(
            data={"updated_count": updated_count, "unread_count": 0},
        )
