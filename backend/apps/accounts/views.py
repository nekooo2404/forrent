from drf_spectacular.utils import extend_schema
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from apps.accounts.serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    LogoutSerializer,
    OTPRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSummarySerializer,
)
from apps.common.permissions import IsAdmin
from apps.common.responses import success_response
from apps.common.audit import audit_event, audit_hash
from apps.common.models import AuditLog
from apps.common.viewsets import StandardResponseModelViewSetMixin

User = get_user_model()


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"
    serializer_class = RegisterSerializer

    @extend_schema(request=RegisterSerializer, responses=UserSummarySerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        audit_event(
            "auth.registered",
            request=request,
            actor=user,
            target=user,
            metadata={"role": user.role},
        )
        return success_response(
            data=UserSummarySerializer(user, context={"request": request}).data,
            message="Register successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"
    serializer_class = LoginSerializer

    @extend_schema(request=LoginSerializer, responses=LoginResponseSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except APIException:
            audit_event(
                "auth.login_failed",
                request=request,
                status=AuditLog.Status.FAILURE,
                metadata={"identifier_hash": audit_hash(request.data.get("identifier"))},
            )
            raise
        auth_data = serializer.validated_data["auth_data"]
        audit_event("auth.login_succeeded", request=request, actor=auth_data["user"])
        data = {
            "access": auth_data["access"],
            "refresh": auth_data["refresh"],
            "user": UserSummarySerializer(auth_data["user"], context={"request": request}).data,
        }
        return success_response(data=data, message="Login successfully.")


class LogoutAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "logout"
    serializer_class = LogoutSerializer

    @extend_schema(request=LogoutSerializer)
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(message="Logout successfully.")


class RefreshAPIView(APIView):
    permission_classes = [AllowAny]
    serializer_class = TokenRefreshSerializer

    @extend_schema(request=TokenRefreshSerializer)
    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(str(exc)) from exc
        return success_response(data=serializer.validated_data, message="Token refreshed successfully.")


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSummarySerializer

    @extend_schema(responses=UserSummarySerializer)
    def get(self, request):
        return success_response(
            data=UserSummarySerializer(request.user, context={"request": request}).data,
            message="Success",
        )


class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileUpdateSerializer

    @extend_schema(request=ProfileUpdateSerializer, responses=UserSummarySerializer)
    def put(self, request):
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response(
            data=UserSummarySerializer(user, context={"request": request}).data,
            message="Profile updated successfully.",
        )


class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    @extend_schema(request=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit_event("auth.password_changed", request=request, actor=request.user)
        return success_response(message="Password changed successfully.")


class OTPRequestAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"
    serializer_class = OTPRequestSerializer

    @extend_schema(request=OTPRequestSerializer)
    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(message="OTP has been sent if the request is valid.")


class PasswordResetRequestAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"
    serializer_class = PasswordResetRequestSerializer

    @extend_schema(request=PasswordResetRequestSerializer)
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            message="If the email exists, password reset instructions have been sent.",
        )


class PasswordResetConfirmAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"
    serializer_class = PasswordResetConfirmSerializer

    @extend_schema(request=PasswordResetConfirmSerializer)
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit_event(
            "auth.password_reset_confirmed",
            request=request,
            status=AuditLog.Status.SUCCESS,
            metadata={"email_hash": audit_hash(request.data.get("email"))},
        )
        return success_response(message="Password reset successfully.")


class AdminUserViewSet(StandardResponseModelViewSetMixin, ModelViewSet):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("role", "is_active")
    search_fields = ("full_name", "email", "phone")
    ordering_fields = ("created_at", "full_name", "email", "role")
    http_method_names = ["get", "post", "patch", "head", "options"]

    def perform_create(self, serializer):
        user = serializer.save()
        audit_event(
            "admin.user_created",
            request=self.request,
            target=user,
            metadata={"role": user.role, "is_active": user.is_active},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        locked_user = User.objects.select_for_update().get(pk=serializer.instance.pk)
        serializer.instance = locked_user
        previous_role = locked_user.role
        previous_is_active = locked_user.is_active
        previous_telegram_chat_id = locked_user.telegram_chat_id
        operator_roles = {User.Role.LANDLORD, User.Role.INDEPENDENT_SALER}
        next_role = serializer.validated_data.get("role", previous_role)
        next_is_active = serializer.validated_data.get("is_active", previous_is_active)
        removes_operator_access = (
            previous_role in operator_roles
            and previous_is_active
            and (next_role not in operator_roles or not next_is_active)
        )
        archived_room_count = 0
        archived_room_ids = []
        reassigned_lead_count = 0
        if removes_operator_access:
            from django.db.models import Q

            from apps.rooms.models import Room
            from apps.viewing_requests.models import ViewingRequest

            archived_room_ids = list(locked_user.created_rooms.exclude(
                status=Room.Status.ARCHIVED,
            ).exclude(
                leases__status="ACTIVE",
            ).values_list("id", flat=True))
            archived_room_count = len(archived_room_ids)
            reassigned_lead_count = ViewingRequest.objects.filter(
                room__created_by=locked_user,
                status__in=ViewingRequest.ACTIVE_STATUSES,
            ).filter(
                Q(assigned_to__isnull=True)
                | Q(assigned_to=locked_user)
                | Q(assigned_to__is_active=False)
            ).count()
        password_changed = "password" in serializer.validated_data and bool(serializer.validated_data.get("password"))
        user = serializer.save()
        if removes_operator_access:
            audit_event(
                "admin.rental_operator_access_revoked",
                request=self.request,
                target=user,
                metadata={
                    "previous_role": previous_role,
                    "next_role": user.role,
                    "archived_room_count": archived_room_count,
                    "archived_room_ids": archived_room_ids,
                    "reassigned_lead_count": reassigned_lead_count,
                },
            )
        if user.role != previous_role:
            audit_event(
                "admin.user_role_changed",
                request=self.request,
                target=user,
                metadata={"from": previous_role, "to": user.role},
            )
        if user.is_active != previous_is_active:
            audit_event(
                "admin.user_active_changed",
                request=self.request,
                target=user,
                metadata={"from": previous_is_active, "to": user.is_active},
            )
        if password_changed:
            audit_event("admin.user_password_changed", request=self.request, target=user)
        if user.telegram_chat_id != previous_telegram_chat_id:
            audit_event(
                "admin.user_telegram_destination_changed",
                request=self.request,
                target=user,
                metadata={"configured": bool(user.telegram_chat_id)},
            )
