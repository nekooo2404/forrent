from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.commissions.views import CommissionPayoutViewSet, CommissionSummaryAPIView

router = DefaultRouter()
router.register("payouts", CommissionPayoutViewSet, basename="commission-payout")

urlpatterns = [
    path("summary/", CommissionSummaryAPIView.as_view(), name="commission-summary"),
] + router.urls
