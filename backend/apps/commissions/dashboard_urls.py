from django.urls import path

from apps.commissions.views import DashboardSummaryAPIView

urlpatterns = [
    path("summary/", DashboardSummaryAPIView.as_view(), name="dashboard-summary"),
]
