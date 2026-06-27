from django.contrib import admin

from apps.viewing_requests.models import ViewingRequest


@admin.register(ViewingRequest)
class ViewingRequestAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "room", "status", "estimated_commission_amount", "actual_commission_amount", "created_at")
    list_filter = ("status", "is_commission_counted", "room__city", "room__ward")
    search_fields = ("full_name", "email", "phone", "room__title")
    readonly_fields = ("confirmed_at", "moved_in_at", "created_at", "updated_at")
