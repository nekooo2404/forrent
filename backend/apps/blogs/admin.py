from django.contrib import admin

from apps.blogs.models import Blog


@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "author", "published_at", "created_at")
    list_filter = ("status", "author")
    search_fields = ("title", "short_description", "content")
    prepopulated_fields = {"slug": ("title",)}
