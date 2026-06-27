from rest_framework import serializers

from apps.blogs.models import Blog


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
