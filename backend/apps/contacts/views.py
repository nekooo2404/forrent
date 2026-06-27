from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.common.permissions import IsAdminOrSaler
from apps.common.responses import success_response
from apps.common.viewsets import StandardResponseModelViewSetMixin
from apps.contacts.models import ContactMessage
from apps.contacts.serializers import AdminContactMessageSerializer, ContactCreateSerializer


class ContactCreateAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "contact"

    @extend_schema(request=ContactCreateSerializer, responses=ContactCreateSerializer)
    def post(self, request):
        serializer = ContactCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()
        return success_response(
            data=ContactCreateSerializer(contact).data,
            message="Contact message sent successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class AdminContactMessageViewSet(StandardResponseModelViewSetMixin, ModelViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = AdminContactMessageSerializer
    permission_classes = [IsAdminOrSaler]
    filterset_fields = ("status",)
    search_fields = ("full_name", "phone", "email", "message")
    ordering_fields = ("created_at",)
    http_method_names = ["get", "patch", "delete", "head", "options"]
