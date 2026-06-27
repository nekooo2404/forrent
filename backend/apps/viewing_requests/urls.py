from django.urls import path

from apps.viewing_requests.views import MyViewingRequestListAPIView, ViewingRequestCreateAPIView

urlpatterns = [
    path("", ViewingRequestCreateAPIView.as_view(), name="viewing-request-create"),
    path("my/", MyViewingRequestListAPIView.as_view(), name="my-viewing-requests"),
]
