from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView

from apps.commissions.selectors import commission_summary, dashboard_summary
from apps.commissions.serializers import CommissionSummarySerializer, DashboardSummarySerializer
from apps.common.permissions import IsAdminOrSaler
from apps.common.responses import success_response


class CommissionSummaryAPIView(APIView):
    permission_classes = [IsAdminOrSaler]

    @extend_schema(responses=CommissionSummarySerializer)
    def get(self, request):
        return success_response(data=commission_summary())


class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAdminOrSaler]

    @extend_schema(responses=DashboardSummarySerializer)
    def get(self, request):
        return success_response(data=dashboard_summary())
