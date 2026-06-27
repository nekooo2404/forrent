from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.blogs.models import Blog
from apps.blogs.serializers import AdminBlogSerializer, PublicBlogSerializer
from apps.common.permissions import IsAdminOrSaler
from apps.common.viewsets import StandardResponseModelViewSetMixin, StandardResponseReadOnlyMixin


@method_decorator(cache_control(public=True, max_age=300), name="list")
@method_decorator(cache_control(public=True, max_age=600), name="retrieve")
class PublicBlogViewSet(StandardResponseReadOnlyMixin, ReadOnlyModelViewSet):
    serializer_class = PublicBlogSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    search_fields = ("title", "short_description", "content")
    ordering_fields = ("published_at", "created_at")

    def get_queryset(self):
        return Blog.objects.published().select_related("author")


class AdminBlogViewSet(StandardResponseModelViewSetMixin, ModelViewSet):
    queryset = Blog.objects.select_related("author").all()
    serializer_class = AdminBlogSerializer
    permission_classes = [IsAdminOrSaler]
    filterset_fields = ("status", "author")
    search_fields = ("title", "short_description", "content")
    ordering_fields = ("published_at", "created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
        cache.delete_pattern("blog-list*") if hasattr(cache, "delete_pattern") else None

    def perform_update(self, serializer):
        serializer.save()
        cache.delete_pattern("blog-list*") if hasattr(cache, "delete_pattern") else None
