from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.accounts.serializers import (
    ChangePasswordSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSummarySerializer,
)
from apps.common.responses import success_response


class RegisterAPIView(APIView):
    throttle_scope = "register"
    serializer_class = RegisterSerializer

    @extend_schema(request=RegisterSerializer, responses=UserSummarySerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return success_response(
            data=UserSummarySerializer(user, context={"request": request}).data,
            message="Register successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    throttle_scope = "login"
    serializer_class = LoginSerializer

    @extend_schema(request=LoginSerializer, responses=LoginResponseSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        auth_data = serializer.validated_data["auth_data"]
        data = {
            "access": auth_data["access"],
            "refresh": auth_data["refresh"],
            "user": UserSummarySerializer(auth_data["user"], context={"request": request}).data,
        }
        return success_response(data=data, message="Login successfully.")


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    @extend_schema(request=LogoutSerializer)
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(message="Logout successfully.")


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
        return success_response(message="Password changed successfully.")


class PasswordResetRequestAPIView(APIView):
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
    throttle_scope = "password_reset"
    serializer_class = PasswordResetConfirmSerializer

    @extend_schema(request=PasswordResetConfirmSerializer)
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(message="Password reset successfully.")
