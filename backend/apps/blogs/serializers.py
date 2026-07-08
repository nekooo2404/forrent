from rest_framework import serializers

from apps.blogs.models import Blog
from apps.common.image_validation import validate_uploaded_image_file


class PublicBlogSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = Blog
        fields = (
            "id",
            "title",
            "slug",
            "thumbnail",
            "short_description",
            "content",
            "author_name",
            "published_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class TenantBlogCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = ("id", "title", "short_description", "content", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title is required.")
        return value

    def validate_short_description(self, value):
        value = value.strip()
        if len(value) > 500:
            raise serializers.ValidationError("Short description must be 500 characters or fewer.")
        return value

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Content is required.")
        if len(value) > 20000:
            raise serializers.ValidationError("Content must be 20000 characters or fewer.")
        return value


class AdminBlogSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = Blog
        fields = (
            "id",
            "title",
            "slug",
            "thumbnail",
            "short_description",
            "content",
            "status",
            "author",
            "author_name",
            "published_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "author", "author_name", "created_at", "updated_at")

    def validate_thumbnail(self, value):
        if value:
            try:
                validate_uploaded_image_file(value, "thumbnail")
            except serializers.ValidationError as exc:
                raise serializers.ValidationError(exc.detail["thumbnail"]) from exc
        return value
