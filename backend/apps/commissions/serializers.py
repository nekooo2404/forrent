from rest_framework import serializers

from apps.commissions.models import CommissionPayout


class CommissionSummarySerializer(serializers.Serializer):
    total_received_commission = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_estimated_commission = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_pending_payout = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_approved_payout = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_paid_payout = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_moved_in_leads = serializers.IntegerField()
    total_pending_leads = serializers.IntegerField()
    by_room = serializers.ListField()
    by_month = serializers.ListField()


class DashboardSummarySerializer(serializers.Serializer):
    total_rooms = serializers.IntegerField()
    active_rooms = serializers.IntegerField()
    total_viewing_requests = serializers.IntegerField()
    total_new_leads = serializers.IntegerField()
    total_moved_in_leads = serializers.IntegerField()
    total_estimated_commission = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_received_commission = serializers.DecimalField(max_digits=14, decimal_places=2)
    status_counts = serializers.DictField(child=serializers.IntegerField())
    latest_leads = serializers.ListField()


class CommissionPayoutSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True)
    paid_by_name = serializers.CharField(source="paid_by.full_name", read_only=True)
    cancelled_by_name = serializers.CharField(source="cancelled_by.full_name", read_only=True)
    room_title = serializers.CharField(source="viewing_request.room.title", read_only=True)
    tenant_name = serializers.CharField(source="viewing_request.full_name", read_only=True)

    class Meta:
        model = CommissionPayout
        fields = (
            "id",
            "viewing_request",
            "room_title",
            "tenant_name",
            "amount",
            "status",
            "approved_by",
            "approved_by_name",
            "paid_by",
            "paid_by_name",
            "cancelled_by",
            "cancelled_by_name",
            "approved_at",
            "paid_at",
            "cancelled_at",
            "note",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "viewing_request",
            "room_title",
            "tenant_name",
            "approved_by",
            "approved_by_name",
            "paid_by",
            "paid_by_name",
            "cancelled_by",
            "cancelled_by_name",
            "approved_at",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        next_status = attrs.get("status")
        if not self.instance or not next_status or next_status == self.instance.status:
            return attrs

        current = self.instance.status
        allowed = {
            CommissionPayout.Status.PENDING: {CommissionPayout.Status.APPROVED, CommissionPayout.Status.CANCELLED},
            CommissionPayout.Status.APPROVED: {CommissionPayout.Status.PAID, CommissionPayout.Status.CANCELLED},
            CommissionPayout.Status.PAID: set(),
            CommissionPayout.Status.CANCELLED: set(),
        }
        if next_status not in allowed[current]:
            raise serializers.ValidationError({"status": f"Cannot change payout from {current} to {next_status}."})
        if next_status == CommissionPayout.Status.CANCELLED and not attrs.get("note") and not self.instance.note:
            raise serializers.ValidationError({"note": "Cancellation reason is required."})
        return attrs
