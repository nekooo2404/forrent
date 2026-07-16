from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.core.cache import cache
from django.db import connections
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from apps.accounts.views import AdminUserViewSet
from apps.blogs.views import AdminBlogViewSet, PublicBlogViewSet
from apps.common.views import SendifyTemplatesAPIView
from apps.contacts.views import ContactCreateAPIView, AdminContactMessageViewSet
from apps.locations.views import (
    AdminAmenityViewSet,
    AdminAreaRangeViewSet,
    AdminCityViewSet,
    AdminWardViewSet,
)
from apps.rooms.views import AdminDepositTypeViewSet, AdminRoomViewSet, PublicRoomFiltersAPIView, PublicRoomViewSet
from apps.viewing_requests.views import AdminViewingRequestViewSet

admin_router = DefaultRouter()
admin_router.register("cities", AdminCityViewSet, basename="admin-city")
admin_router.register("wards", AdminWardViewSet, basename="admin-ward")
admin_router.register("amenities", AdminAmenityViewSet, basename="admin-amenity")
admin_router.register("area-ranges", AdminAreaRangeViewSet, basename="admin-area-range")
admin_router.register("deposit-types", AdminDepositTypeViewSet, basename="admin-deposit-type")
admin_router.register("rooms", AdminRoomViewSet, basename="admin-room")
admin_router.register("viewing-requests", AdminViewingRequestViewSet, basename="admin-viewing-request")
admin_router.register("blogs", AdminBlogViewSet, basename="admin-blog")
admin_router.register("contacts", AdminContactMessageViewSet, basename="admin-contact")
admin_router.register("users", AdminUserViewSet, basename="admin-user")

public_router = DefaultRouter()
public_router.register("rooms", PublicRoomViewSet, basename="room")
public_router.register("blogs", PublicBlogViewSet, basename="blog")


def media_storage_configured():
    backend = settings.STORAGES.get("default", {}).get("BACKEND", "")
    if backend.endswith("CloudinaryMediaStorage"):
        return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET)
    return bool(settings.MEDIA_ROOT)


def health_check(_request):
    checks = {
        "database": False,
        "cache": False,
        "media_storage": media_storage_configured(),
    }

    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = True
    except Exception:
        pass

    try:
        cache.set("health-check", "ok", timeout=5)
        checks["cache"] = cache.get("health-check") == "ok"
    except Exception:
        pass

    healthy = all(checks.values())
    return JsonResponse(
        {"status": "ok" if healthy else "error", "checks": checks},
        status=200 if healthy else 503,
    )


urlpatterns = [
    path("api/health/", health_check, name="health-check"),
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/rooms/filters/", PublicRoomFiltersAPIView.as_view(), name="room-filters"),
    path("api/", include(public_router.urls)),
    path("api/viewing-requests/", include("apps.viewing_requests.urls")),
    path("api/contact/", ContactCreateAPIView.as_view(), name="contact"),
    path("api/admin/dashboard/", include("apps.commissions.dashboard_urls")),
    path("api/admin/commissions/", include("apps.commissions.urls")),
    path(
        "api/admin/sendify/templates/",
        SendifyTemplatesAPIView.as_view(),
        name="admin-sendify-templates",
    ),
    path("api/admin/", include(admin_router.urls)),
]

if settings.EXPOSE_API_DOCS:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
