import pytest
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
