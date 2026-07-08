from django.contrib import admin

from apps.rooms.models import DepositType, Room, RoomImage


@admin.register(DepositType)
class DepositTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name",)


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 0


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("title", "room_type", "city", "ward", "price", "deposit_type", "deposit_amount", "status", "estimated_commission_amount")
    list_filter = ("room_type", "status", "city", "ward", "deposit_type")
    search_fields = ("title", "address", "description", "internal_note")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [RoomImageInline]


@admin.register(RoomImage)
class RoomImageAdmin(admin.ModelAdmin):
    list_display = ("room", "sort_order", "created_at")
    list_filter = ("room",)
