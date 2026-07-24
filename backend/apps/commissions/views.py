from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.commissions.models import CommissionPayout
from apps.commissions.selectors import commission_summary, dashboard_summary
from apps.commissions.serializers import (
    CommissionPayoutSerializer,
    CommissionSummarySerializer,
    DashboardSummarySerializer,
    LandlordCommissionPayoutSerializer,
    LandlordCommissionSummarySerializer,
)
from apps.common.permissions import IsAdmin, IsLandlord
from apps.common.responses import success_response
from apps.common.audit import audit_event
from apps.common.viewsets import StandardResponseModelViewSetMixin, StandardResponseReadOnlyMixin


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


class LandlordCommissionPayoutViewSet(StandardResponseReadOnlyMixin, ReadOnlyModelViewSet):
    serializer_class = LandlordCommissionPayoutSerializer
    permission_classes = [IsLandlord]
    filterset_fields = ("status",)
    search_fields = ("viewing_request__full_name", "viewing_request__room__title", "viewing_request__room__room_code")
    ordering_fields = ("created_at", "amount", "approved_at", "paid_at")
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        return CommissionPayout.objects.select_related(
            "viewing_request",
            "viewing_request__room",
        ).filter(viewing_request__room__created_by=self.request.user)

    @extend_schema(responses=LandlordCommissionSummarySerializer)
    @action(detail=False, methods=["get"])
    def summary(self, request):
        rows = self.get_queryset().values("status").annotate(count=Count("id"), amount=Sum("amount"))
        statuses = {
            status: {"count": 0, "amount": Decimal("0")}
            for status in CommissionPayout.Status.values
        }
        for row in rows:
            statuses[row["status"]] = {"count": row["count"], "amount": row["amount"] or Decimal("0")}

        data = {
            "total": sum(item["count"] for item in statuses.values()),
            "pending": statuses[CommissionPayout.Status.PENDING]["count"],
            "approved": statuses[CommissionPayout.Status.APPROVED]["count"],
            "paid": statuses[CommissionPayout.Status.PAID]["count"],
            "cancelled": statuses[CommissionPayout.Status.CANCELLED]["count"],
            "total_amount": sum((item["amount"] for item in statuses.values()), Decimal("0")),
            "pending_amount": statuses[CommissionPayout.Status.PENDING]["amount"],
            "approved_amount": statuses[CommissionPayout.Status.APPROVED]["amount"],
            "paid_amount": statuses[CommissionPayout.Status.PAID]["amount"],
        }
        return success_response(data=LandlordCommissionSummarySerializer(data).data)
