from drf_spectacular.utils import extend_schema
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.commissions.models import CommissionPayout
from apps.commissions.selectors import commission_summary, dashboard_summary
from apps.commissions.serializers import CommissionPayoutSerializer, CommissionSummarySerializer, DashboardSummarySerializer
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response
from apps.common.audit import audit_event
from apps.common.viewsets import StandardResponseModelViewSetMixin


class CommissionSummaryAPIView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=CommissionSummarySerializer)
    def get(self, request):
        return success_response(data=commission_summary())


class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=DashboardSummarySerializer)
    def get(self, request):
        return success_response(data=dashboard_summary())


class CommissionPayoutViewSet(StandardResponseModelViewSetMixin, ModelViewSet):
    serializer_class = CommissionPayoutSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("status",)
    search_fields = ("viewing_request__full_name", "viewing_request__phone", "viewing_request__room__title")
    ordering_fields = ("created_at", "amount", "approved_at", "paid_at")
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return CommissionPayout.objects.select_related(
            "approved_by",
            "paid_by",
            "cancelled_by",
            "viewing_request",
            "viewing_request__room",
        )

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        payout = serializer.save()
        status = serializer.validated_data.get("status")
        if status == CommissionPayout.Status.APPROVED and payout.approved_at is None:
            payout.approved_by = self.request.user
            payout.approved_at = timezone.now()
            payout.save(update_fields=["approved_by", "approved_at", "updated_at"])
        elif status == CommissionPayout.Status.PAID and payout.paid_at is None:
            payout.paid_at = timezone.now()
            payout.paid_by = self.request.user
            if payout.approved_at is None:
                payout.approved_by = self.request.user
                payout.approved_at = payout.paid_at
                payout.save(update_fields=["paid_at", "paid_by", "approved_by", "approved_at", "updated_at"])
            else:
                payout.save(update_fields=["paid_at", "paid_by", "updated_at"])
        elif status == CommissionPayout.Status.CANCELLED and payout.cancelled_at is None:
            payout.cancelled_by = self.request.user
            payout.cancelled_at = timezone.now()
            payout.save(update_fields=["cancelled_by", "cancelled_at", "updated_at"])
        if status and status != previous_status:
            audit_event(
                "commission.payout_status_changed",
                request=self.request,
                target=payout,
                metadata={"from": previous_status, "to": payout.status, "viewing_request_id": payout.viewing_request_id},
            )
