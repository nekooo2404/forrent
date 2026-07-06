from django.contrib import admin

from apps.common.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "event", "status", "actor", "target_model", "target_id", "ip_address")
    list_filter = ("event", "status", "target_model", "created_at")
    search_fields = ("event", "actor__email", "target_model", "target_id", "path", "ip_address")
    readonly_fields = (
        "event",
        "status",
        "actor",
        "target_model",
        "target_id",
        "method",
        "path",
        "ip_address",
        "user_agent",
        "metadata",
        "created_at",
        "updated_at",
    )
