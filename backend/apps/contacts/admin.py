from django.contrib import admin

from apps.contacts.models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone", "email", "room", "status", "assigned_to", "created_at")
    list_filter = ("status", "room", "assigned_to")
    search_fields = ("full_name", "phone", "email", "message", "admin_note", "room__title")
