from drf_spectacular.utils import extend_schema
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.common.permissions import IsAdminOrSaler
from apps.common.responses import success_response
from apps.common.viewsets import StandardResponseModelViewSetMixin
from apps.contacts.models import ContactMessage
from apps.contacts.serializers import AdminContactMessageSerializer, ContactConvertResponseSerializer, ContactCreateSerializer
from apps.viewing_requests.services import ViewingRequestService

User = get_user_model()


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
    queryset = ContactMessage.objects.select_related("room", "assigned_to", "converted_viewing_request").all()
    serializer_class = AdminContactMessageSerializer
    permission_classes = [IsAdminOrSaler]
    filterset_fields = ("status",)
    search_fields = ("full_name", "phone", "email", "message")
    ordering_fields = ("created_at",)
    http_method_names = ["get", "patch", "post", "delete", "head", "options"]

    @extend_schema(responses=ContactConvertResponseSerializer)
    @action(detail=True, methods=["post"], url_path="convert-to-lead")
    @transaction.atomic
    def convert_to_lead(self, request, pk=None):
        contact = ContactMessage.objects.select_for_update().select_related("room").get(pk=pk)
        if contact.converted_viewing_request_id:
            return success_response(
                data={
                    "contact_id": contact.id,
                    "viewing_request_id": contact.converted_viewing_request_id,
                },
                message="Contact has already been converted.",
            )
        if contact.room is None:
            raise ValidationError({"room": "Select an interested room before converting this contact."})
        if not contact.email:
            raise ValidationError({"email": "Email is required before converting contact to a tenant lead."})

        user = User.objects.filter(phone=contact.phone).first()
        if user is None and contact.email:
            user = User.objects.filter(email__iexact=contact.email).first()
        if user is None:
            user = User.objects.create_user(
                email=contact.email.lower(),
                phone=contact.phone,
                password=None,
                full_name=contact.full_name,
                role=User.Role.TENANT,
            )

        viewing_request = ViewingRequestService.create_contact_viewing_request(
            user=user,
            room=contact.room,
            full_name=contact.full_name,
            phone=contact.phone,
            email=contact.email or user.email,
        )
        contact.status = ContactMessage.Status.HANDLED
        contact.converted_viewing_request = viewing_request
        contact.assigned_to = request.user
        contact.save(update_fields=["status", "converted_viewing_request", "assigned_to", "updated_at"])
        return success_response(
            data={
                "contact_id": contact.id,
                "viewing_request_id": viewing_request.id,
            },
            message="Contact converted to lead successfully.",
        )

    @action(detail=False, methods=["post"], url_path="bulk-update")
    @transaction.atomic
    def bulk_update(self, request):
        ids = request.data.get("ids") or []
        next_status = request.data.get("status")
        if not ids:
            raise ValidationError({"ids": "Select at least one contact."})
        if next_status not in ContactMessage.Status.values:
            raise ValidationError({"status": "Invalid contact status."})
        updated_count = ContactMessage.objects.select_for_update().filter(id__in=ids).update(status=next_status)
        return success_response(data={"updated_count": updated_count}, message="Contacts updated successfully.")
