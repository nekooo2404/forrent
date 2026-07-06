from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ("-created_at",)


class ActiveQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_active=True)


class AuditLog(TimeStampedModel):
    class Status(models.TextChoices):
        SUCCESS = "SUCCESS", "Success"
        FAILURE = "FAILURE", "Failure"

    event = models.CharField(max_length=100)
    status = models.CharField(max_length=16, choices=Status.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    target_model = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    method = models.CharField(max_length=12, blank=True)
    path = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["event", "created_at"], name="common_audit_event_idx"),
            models.Index(fields=["actor", "created_at"], name="common_audit_actor_idx"),
            models.Index(fields=["status", "created_at"], name="common_audit_status_idx"),
        ]
