from django.contrib import admin

from apps.locations.models import Amenity, AreaRange, City, Ward


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "slug", "is_active", "created_at")
    list_filter = ("city", "is_active")
    search_fields = ("name", "slug", "city__name")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "is_active")
    search_fields = ("name",)


@admin.register(AreaRange)
class AreaRangeAdmin(admin.ModelAdmin):
    list_display = ("name", "min_area", "max_area", "is_active")
    search_fields = ("name",)
