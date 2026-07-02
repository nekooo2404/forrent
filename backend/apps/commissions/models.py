from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel
from apps.viewing_requests.models import ViewingRequest


class CommissionPayout(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    viewing_request = models.OneToOneField(ViewingRequest, on_delete=models.PROTECT, related_name="commission_payout")
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_commission_payouts",
        null=True,
        blank=True,
    )
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="paid_commission_payouts",
        null=True,
        blank=True,
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_commission_payouts",
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def approve(self, actor):
        self.status = self.Status.APPROVED
        self.approved_by = actor
        self.approved_at = timezone.now()

    def mark_paid(self):
        self.status = self.Status.PAID
        self.paid_at = timezone.now()

    def __str__(self):
        return f"{self.viewing_request_id} - {self.amount} - {self.status}"
