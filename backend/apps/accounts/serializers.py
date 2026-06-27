from django.contrib.auth import password_validation
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.services import AuthService


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "date_of_birth", "email", "phone", "role", "avatar")
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        return AuthService.register_tenant(**validated_data)


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        auth_data = AuthService.login(
            identifier=attrs["identifier"],
            password=attrs["password"],
        )
        attrs["auth_data"] = auth_data
        return attrs


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSummarySerializer()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def save(self, **kwargs):
        AuthService.logout(refresh_token=self.validated_data["refresh"])


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("full_name", "date_of_birth", "phone", "email", "avatar")

    def validate_email(self, value):
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This email is already registered.")
        return value.lower()

    def validate_phone(self, value):
        queryset = User.objects.filter(phone=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This phone is already registered.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match."})
        password_validation.validate_password(attrs["new_password"], user=self.context["request"].user)
        return attrs

    def save(self, **kwargs):
        return AuthService.change_password(
            user=self.context["request"].user,
            old_password=self.validated_data["old_password"],
            new_password=self.validated_data["new_password"],
        )


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self, **kwargs):
        request = self.context.get("request")
        requested_ip = None
        user_agent = ""
        if request:
            forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
            requested_ip = forwarded_for.split(",")[0].strip() or request.META.get("REMOTE_ADDR")
            user_agent = request.META.get("HTTP_USER_AGENT", "")
        return AuthService.request_password_reset(
            email=self.validated_data["email"],
            requested_ip=requested_ip,
            user_agent=user_agent,
        )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.IntegerField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match."})
        password_validation.validate_password(attrs["new_password"])
        return attrs

    def save(self, **kwargs):
        return AuthService.confirm_password_reset(
            user_id=self.validated_data["uid"],
            token=self.validated_data["token"],
            new_password=self.validated_data["new_password"],
        )
