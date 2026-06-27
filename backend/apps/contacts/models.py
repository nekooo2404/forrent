from django.db import models

from apps.common.models import TimeStampedModel
from apps.common.validators import validate_vietnamese_phone


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

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.full_name} - {self.phone}"
