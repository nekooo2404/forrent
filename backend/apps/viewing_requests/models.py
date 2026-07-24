from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from apps.common.models import TimeStampedModel
from apps.rooms.models import Room


class ViewingRequest(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "NEW", "New"
        CONTACTED = "CONTACTED", "Contacted"
        SCHEDULED = "SCHEDULED", "Scheduled"
        VIEWED = "VIEWED", "Viewed"
        CONVERTED = "CONVERTED", "Converted"
        CANCELLED = "CANCELLED", "Cancelled"
        NO_SHOW = "NO_SHOW", "No show"

    class TimeSlot(models.TextChoices):
        MORNING = "morning", "Morning, 9:00 - 12:00"
        AFTERNOON = "afternoon", "Afternoon, 12:00 - 16:00"
        EVENING = "evening", "Evening, 16:00 - 19:00"

    ACTIVE_STATUSES = (Status.NEW, Status.CONTACTED, Status.SCHEDULED, Status.VIEWED)

    @classmethod
    def can_transition(cls, current_status, next_status):
        if current_status == next_status:
            return True
        allowed = {
            cls.Status.NEW: {cls.Status.CONTACTED, cls.Status.SCHEDULED, cls.Status.CANCELLED},
            cls.Status.CONTACTED: {cls.Status.SCHEDULED, cls.Status.CANCELLED},
            cls.Status.SCHEDULED: {cls.Status.VIEWED, cls.Status.CONVERTED, cls.Status.CANCELLED, cls.Status.NO_SHOW},
            cls.Status.VIEWED: {cls.Status.CONVERTED, cls.Status.CANCELLED},
            cls.Status.CONVERTED: set(),
            cls.Status.CANCELLED: set(),
            cls.Status.NO_SHOW: set(),
        }
        return next_status in allowed.get(current_status, set())

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
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_viewing_requests",
        null=True,
        blank=True,
    )
    next_follow_up_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    appointment_date = models.DateField(null=True, blank=True)
    appointment_time_slot = models.CharField(max_length=20, choices=TimeSlot.choices, blank=True)
    moved_in_at = models.DateTimeField(null=True, blank=True)
    is_commission_counted = models.BooleanField(default=False)
    estimated_commission_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    actual_commission_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "room", "status"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["appointment_date"], name="viewing_appointment_idx"),
        ]

    def __str__(self):
        return f"{self.full_name} - {self.room}"


class ViewingRequestActivity(TimeStampedModel):
    viewing_request = models.ForeignKey(ViewingRequest, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="viewing_request_activities", null=True, blank=True)
    action = models.CharField(max_length=50)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["viewing_request", "created_at"]),
        ]

    def __str__(self):
        return f"{self.viewing_request_id} - {self.action}"


class LandlordNotification(TimeStampedModel):
    class Type(models.TextChoices):
        NEW_VIEWING_REQUEST = "NEW_VIEWING_REQUEST", "New viewing request"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="landlord_notifications",
    )
    viewing_request = models.ForeignKey(
        ViewingRequest,
        on_delete=models.CASCADE,
        related_name="landlord_notifications",
    )
    type = models.CharField(max_length=40, choices=Type.choices)
    read_at = models.DateTimeField(null=True, blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    telegram_sent_at = models.DateTimeField(null=True, blank=True)
    delivery_attempted_at = models.DateTimeField(null=True, blank=True)
    last_delivery_error = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("recipient", "viewing_request", "type"),
                name="unique_landlord_notification_event",
            ),
        ]
        indexes = [
            models.Index(
                fields=("recipient", "read_at", "created_at"),
                name="landlord_notification_feed_idx",
            ),
        ]

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.recipient_id} - {self.type} - {self.viewing_request_id}"


class RoomLease(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ENDED = "ENDED", "Ended"

    viewing_request = models.OneToOneField(ViewingRequest, on_delete=models.PROTECT, related_name="lease")
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="leases")
    tenant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="leases")
    move_in_at = models.DateTimeField()
    move_out_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ("-move_in_at",)
        constraints = [
            models.UniqueConstraint(fields=["room"], condition=Q(status="ACTIVE"), name="unique_active_lease_per_room"),
        ]
        indexes = [
            models.Index(fields=["room", "status"]),
        ]

    def __str__(self):
        return f"{self.room_id} - {self.tenant_id} - {self.status}"
