from django.contrib.auth import password_validation
from rest_framework import serializers

from apps.accounts.models import PasswordResetToken, User
from apps.accounts.services import AuthService
from apps.common.validators import normalize_vietnamese_phone, validate_vietnamese_phone


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "date_of_birth", "email", "phone", "role", "avatar")
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8, allow_blank=True)
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "date_of_birth",
            "email",
            "phone",
            "role",
            "is_active",
            "password",
            "current_password",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_email(self, value):
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This email is already registered.")
        return value.lower()

    def validate_phone(self, value):
        value = normalize_vietnamese_phone(value)
        validate_vietnamese_phone(value)
        queryset = User.objects.filter(phone=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This phone is already registered.")
        return value

    def validate_role(self, value):
        if value not in {User.Role.TENANT, User.Role.SALER}:
            raise serializers.ValidationError("Role must be TENANT or SALER.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        current_password = validated_data.pop("current_password", "")
        role = validated_data.get("role", User.Role.TENANT)
        actor = self.context["request"].user
        if role == User.Role.SALER and not actor.check_password(current_password):
            raise serializers.ValidationError({"current_password": "Current admin password is required."})
        if password:
            password_validation.validate_password(password)
        user = User.objects.create_user(
            password=password,
            is_staff=role == User.Role.SALER,
            is_superuser=False,
            **validated_data,
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        current_password = validated_data.pop("current_password", "")
        actor = self.context["request"].user
        sensitive_change = password or (validated_data.get("role") and validated_data.get("role") != instance.role)
        if sensitive_change and not actor.check_password(current_password):
            raise serializers.ValidationError({"current_password": "Current admin password is required."})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.is_staff = instance.role == User.Role.SALER
        instance.is_superuser = False
        instance.admin_updated_by = actor
        if password:
            password_validation.validate_password(password, user=instance)
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    otp = serializers.CharField(write_only=True, required=False, default="", allow_blank=True, min_length=6, max_length=6)

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
    otp = serializers.CharField(write_only=True, required=False, default="", allow_blank=True, min_length=6, max_length=6)

    class Meta:
        model = User
        fields = ("full_name", "date_of_birth", "phone", "email", "avatar", "otp")

    def validate_email(self, value):
        queryset = User.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This email is already registered.")
        return value.lower()

    def validate_phone(self, value):
        value = normalize_vietnamese_phone(value)
        validate_vietnamese_phone(value)
        queryset = User.objects.filter(phone=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("This phone is already registered.")
        return value

    def update(self, instance, validated_data):
        otp = validated_data.pop("otp", "")
        new_email = validated_data.get("email")
        if new_email and new_email.lower() != instance.email.lower():
            AuthService.confirm_otp(email=new_email, otp=otp, purpose=PasswordResetToken.Purpose.CHANGE_EMAIL)
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)
    otp = serializers.CharField(write_only=True, min_length=6, max_length=6)

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
            otp=self.validated_data["otp"],
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
    email = serializers.EmailField()
    otp = serializers.CharField(min_length=6, max_length=6)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match."})
        password_validation.validate_password(attrs["new_password"])
        return attrs

    def save(self, **kwargs):
        return AuthService.confirm_password_reset(
            email=self.validated_data["email"],
            otp=self.validated_data["otp"],
            new_password=self.validated_data["new_password"],
        )


class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=PasswordResetToken.Purpose.choices)

    def save(self, **kwargs):
        request = self.context.get("request")
        email = self.validated_data["email"].lower()
        purpose = self.validated_data["purpose"]
        if purpose == PasswordResetToken.Purpose.PASSWORD_RESET:
            return AuthService.request_password_reset(email=email)
        user = User.objects.filter(email__iexact=email).first()
        if purpose == PasswordResetToken.Purpose.REGISTER and user:
            raise serializers.ValidationError({"email": "This email is already registered."})
        if purpose in {PasswordResetToken.Purpose.CHANGE_EMAIL, PasswordResetToken.Purpose.CHANGE_PASSWORD}:
            actor = getattr(request, "user", None)
            if not actor or not actor.is_authenticated:
                raise serializers.ValidationError({"email": "Authentication is required."})
            user = actor
        if purpose == PasswordResetToken.Purpose.CHANGE_PASSWORD:
            email = user.email
        if purpose == PasswordResetToken.Purpose.CHANGE_EMAIL and User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError({"email": "This email is already registered."})
        return AuthService.issue_otp(email=email, purpose=purpose, user=user)
