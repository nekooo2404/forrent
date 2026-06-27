from rest_framework import serializers


class CommissionSummarySerializer(serializers.Serializer):
    total_received_commission = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_estimated_commission = serializers.DecimalField(max_digits=14, decimal_places=2)
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
    latest_leads = serializers.ListField()
