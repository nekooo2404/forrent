from django.contrib import admin

from apps.commissions.models import CommissionPayout


@admin.register(CommissionPayout)
class CommissionPayoutAdmin(admin.ModelAdmin):
    list_display = ("viewing_request", "amount", "status", "approved_by", "approved_at", "paid_at", "created_at")
    list_filter = ("status", "approved_by")
    search_fields = ("viewing_request__full_name", "viewing_request__phone", "viewing_request__room__title")
