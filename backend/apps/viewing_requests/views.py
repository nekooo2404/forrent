from drf_spectacular.utils import extend_schema
from rest_framework import mixins
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from apps.common.permissions import IsAdminOrSaler, IsTenant
from apps.common.responses import success_response
from apps.common.viewsets import StandardResponseUpdateMixin
from apps.viewing_requests.filters import ViewingRequestAdminFilter
from apps.viewing_requests.selectors import admin_viewing_requests_queryset, user_viewing_requests_queryset
from apps.viewing_requests.models import ViewingRequest
from apps.viewing_requests.serializers import (
    AdminViewingRequestSerializer,
    AppointmentConfirmSerializer,
    BulkViewingRequestUpdateSerializer,
    ConfirmMovedInResponseSerializer,
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
