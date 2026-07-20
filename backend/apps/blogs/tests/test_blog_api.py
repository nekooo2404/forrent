import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.blogs.models import Blog
from apps.rooms.tests.factories import create_user


@pytest.mark.django_db
def test_tenant_can_submit_blog_as_draft_not_public():
    tenant = create_user()
    client = APIClient()
    client.force_authenticate(tenant)

    response = client.post(
        "/api/blogs/",
        {
            "title": "Kinh nghiem thue phong Cau Giay",
            "short_description": "Nhung dieu nen kiem tra truoc khi coc phong.",
            "content": "Nen xem hop dong, tien dien nuoc va khu vuc de xe.",
        },
        format="json",
    )

    assert response.status_code == 201
    blog = Blog.objects.get(title="Kinh nghiem thue phong Cau Giay")
    assert blog.author == tenant
    assert blog.status == Blog.Status.DRAFT
    assert blog.published_at is None

    list_response = client.get("/api/blogs/")
    assert list_response.status_code == 200
    assert list_response.json()["data"]["results"] == []


@pytest.mark.django_db
def test_anonymous_user_cannot_submit_blog():
    response = APIClient().post(
        "/api/blogs/",
        {"title": "No auth", "content": "No auth content."},
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_public_blog_cache_hits_and_invalidates_after_publish_update(django_capture_on_commit_callbacks):
    cache.clear()
    author = create_user()
    blog = Blog.objects.create(
        author=author,
        content="Noi dung huong dan thue phong.",
        short_description="Kinh nghiem thue phong.",
        status=Blog.Status.PUBLISHED,
        title="Cam nang thue phong Ha Noi",
    )

    client = APIClient()
    response = client.get("/api/blogs/")
    cached_response = client.get("/api/blogs/")

    assert response.status_code == 200
    assert response.json()["data"]["results"][0]["id"] == blog.id
    assert response.headers["X-Cache"] == "MISS"
    assert cached_response.headers["X-Cache"] == "HIT"
    assert "public" in response.headers["Cache-Control"]

    with django_capture_on_commit_callbacks(execute=True):
        blog.short_description = "Noi dung da cap nhat."
        blog.save(update_fields=("short_description", "updated_at"))

    refreshed = client.get("/api/blogs/")
    assert refreshed.headers["X-Cache"] == "MISS"
    assert refreshed.json()["data"]["results"][0]["short_description"] == "Noi dung da cap nhat."

    with django_capture_on_commit_callbacks(execute=True):
        blog.delete()

    after_delete = client.get("/api/blogs/")
    assert after_delete.headers["X-Cache"] == "MISS"
    assert after_delete.json()["data"]["results"] == []
