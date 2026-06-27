from django.contrib import admin

from apps.rooms.models import Room, RoomImage


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 0


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("title", "room_type", "city", "ward", "price", "status", "estimated_commission_amount")
    list_filter = ("room_type", "status", "city", "ward")
    search_fields = ("title", "address", "description", "internal_note")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [RoomImageInline]


@admin.register(RoomImage)
class RoomImageAdmin(admin.ModelAdmin):
    list_display = ("room", "sort_order", "created_at")
    list_filter = ("room",)
