from django.contrib import admin

from apps.contacts.models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "email", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("full_name", "phone", "email", "message")
