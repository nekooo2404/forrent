from django.db import models
from django.conf import settings

from apps.common.models import TimeStampedModel
from apps.common.validators import validate_vietnamese_phone
from apps.rooms.models import Room
from apps.viewing_requests.models import ViewingRequest


class ContactMessage(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "NEW", "New"
        READ = "READ", "Read"
        HANDLED = "HANDLED", "Handled"

    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, validators=[validate_vietnamese_phone])
    email = models.EmailField(blank=True)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, related_name="contact_messages", null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_contact_messages",
        null=True,
        blank=True,
    )
    admin_note = models.TextField(blank=True)
    converted_viewing_request = models.OneToOneField(
        ViewingRequest,
        on_delete=models.SET_NULL,
        related_name="source_contact",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.full_name} - {self.phone}"
