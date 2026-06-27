from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.accounts.managers import UserManager
from apps.common.models import TimeStampedModel
from apps.common.validators import validate_vietnamese_phone


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    class Role(models.TextChoices):
        TENANT = "TENANT", "Tenant"
        ADMIN = "ADMIN", "Admin"
        SALER = "SALER", "Saler"

    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, validators=[validate_vietnamese_phone])
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TENANT)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["phone", "full_name"]

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class PasswordResetToken(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    requested_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "used_at", "expires_at"], name="accounts_pa_user_id_662860_idx"),
            models.Index(fields=["token_hash"], name="accounts_pa_token_h_54c975_idx"),
        ]

    @property
    def is_active(self):
        return self.used_at is None and self.expires_at > timezone.now()

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at", "updated_at"])
