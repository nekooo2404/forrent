from django.urls import path

from apps.commissions.views import CommissionSummaryAPIView

urlpatterns = [
    path("summary/", CommissionSummaryAPIView.as_view(), name="commission-summary"),
]
