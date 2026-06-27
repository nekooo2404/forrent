from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel
from apps.rooms.models import Room


class ViewingRequest(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "NEW", "New"
        CONTACTED = "CONTACTED", "Contacted"
        VIEWED = "VIEWED", "Viewed"
        MOVED_IN = "MOVED_IN", "Moved in"
        NOT_MOVED_IN = "NOT_MOVED_IN", "Not moved in"
        CANCELLED = "CANCELLED", "Cancelled"

    class TimeSlot(models.TextChoices):
        MORNING = "morning", "Morning, 9:00 - 12:00"
        AFTERNOON = "afternoon", "Afternoon, 12:00 - 16:00"
        EVENING = "evening", "Evening, 16:00 - 19:00"

    ACTIVE_STATUSES = (Status.NEW, Status.CONTACTED, Status.VIEWED)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="viewing_requests")
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="viewing_requests")
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    preferred_viewing_date = models.DateField(null=True, blank=True)
    preferred_viewing_time_slot = models.CharField(max_length=20, choices=TimeSlot.choices, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    saler_note = models.TextField(blank=True)
    confirmed_at = models.DateTimeField()
    moved_in_at = models.DateTimeField(null=True, blank=True)
    is_commission_counted = models.BooleanField(default=False)
    estimated_commission_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    actual_commission_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "room", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.full_name} - {self.room}"
