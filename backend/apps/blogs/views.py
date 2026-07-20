from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.blogs.models import Blog
from apps.blogs.serializers import AdminBlogSerializer, PublicBlogSerializer, TenantBlogCreateSerializer
from apps.common.permissions import IsAdmin, IsTenant
from apps.common.cache_utils import (
    BLOG_DETAIL_CACHE_NAMESPACE,
    BLOG_LIST_CACHE_NAMESPACE,
    PublicResponseCacheMixin,
)
from apps.common.viewsets import StandardResponseModelViewSetMixin


@method_decorator(cache_control(public=True, max_age=300), name="list")
@method_decorator(cache_control(public=True, max_age=600), name="retrieve")
class PublicBlogViewSet(PublicResponseCacheMixin, StandardResponseModelViewSetMixin, ModelViewSet):
    lookup_field = "slug"
    search_fields = ("title", "short_description", "content")
    ordering_fields = ("published_at", "created_at")
    http_method_names = ["get", "post", "head", "options"]
    public_cache_namespaces = {
        "list": BLOG_LIST_CACHE_NAMESPACE,
        "retrieve": BLOG_DETAIL_CACHE_NAMESPACE,
    }
    public_cache_timeouts = {"list": 300, "retrieve": 600}
    public_cache_query_parameters = {"ordering", "page", "page_size", "search"}

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsTenant()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.action == "create":
            return TenantBlogCreateSerializer
        return PublicBlogSerializer

    def get_queryset(self):
        return Blog.objects.published().select_related("author")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, status=Blog.Status.DRAFT)


class AdminBlogViewSet(StandardResponseModelViewSetMixin, ModelViewSet):
    queryset = Blog.objects.select_related("author").all()
    serializer_class = AdminBlogSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ("status", "author")
    search_fields = ("title", "short_description", "content")
    ordering_fields = ("published_at", "created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
