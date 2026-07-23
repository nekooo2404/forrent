from django.contrib import admin

from apps.rooms.models import DepositType, Room, RoomImage, RoomSubtype


@admin.register(DepositType)
class DepositTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(RoomSubtype)
class RoomSubtypeAdmin(admin.ModelAdmin):
    list_display = ("name", "parent_type", "is_active", "updated_at")
    list_filter = ("parent_type", "is_active")
    search_fields = ("name",)


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 0
    fields = ("image", "image_url", "media_type", "label", "sort_order")


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_code", "title", "building_code", "room_type", "city", "ward", "price", "deposit_type", "deposit_amount", "hero_eligible", "status", "estimated_commission_amount")
    list_filter = ("room_type", "status", "city", "ward", "deposit_type", "hero_eligible")
    search_fields = ("room_code", "title", "building_code", "address", "description", "internal_note")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [RoomImageInline]


@admin.register(RoomImage)
class RoomImageAdmin(admin.ModelAdmin):
    list_display = ("room", "media_type", "label", "sort_order", "created_at")
    list_filter = ("room", "media_type", "label")
