import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient
from urllib.parse import parse_qs, urlparse

from apps.accounts.models import PasswordResetToken

User = get_user_model()


@pytest.mark.django_db
class TestAuthAPI:
    def setup_method(self):
        self.client = APIClient()
        self.payload = {
            "full_name": "Nguyen Van A",
            "date_of_birth": "2000-01-01",
            "phone": "0911111111",
            "email": "tenant@example.com",
            "password": "Password@123",
            "confirm_password": "Password@123",
        }

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(
            email="tenant@example.com",
            phone="0922222222",
            password="Password@123",
            full_name="Existing User",
        )

        response = self.client.post("/api/auth/register/", self.payload, format="json")

        assert response.status_code == 400
        assert response.data["success"] is False
        assert "email" in response.data["errors"]

    def test_register_rejects_duplicate_phone(self):
        User.objects.create_user(
            email="other@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Existing User",
        )

        response = self.client.post("/api/auth/register/", self.payload, format="json")

        assert response.status_code == 400
        assert response.data["success"] is False
        assert "phone" in response.data["errors"]

    def test_login_by_email(self):
        User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )

        response = self.client.post(
            "/api/auth/login/",
            {"identifier": "tenant@example.com", "password": "Password@123"},
            format="json",
        )

        assert response.status_code == 200
        assert "access" in response.data["data"]
        assert response.data["data"]["user"]["email"] == "tenant@example.com"

    def test_login_by_phone(self):
        User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )

        response = self.client.post(
            "/api/auth/login/",
            {"identifier": "0911111111", "password": "Password@123"},
            format="json",
        )

        assert response.status_code == 200
        assert "access" in response.data["data"]
        assert response.data["data"]["user"]["phone"] == "0911111111"

    def test_profile_update_successfully(self):
        tenant = User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )
        self.client.force_authenticate(tenant)

        response = self.client.put(
            "/api/auth/profile/",
            {
                "full_name": "Nguyen Van B",
                "date_of_birth": "1999-02-02",
                "phone": "0922222222",
                "email": "tenant-updated@example.com",
            },
            format="json",
        )

        assert response.status_code == 200
        assert response.data["data"]["full_name"] == "Nguyen Van B"
        assert response.data["data"]["date_of_birth"] == "1999-02-02"
        tenant.refresh_from_db()
        assert tenant.email == "tenant-updated@example.com"
        assert tenant.phone == "0922222222"

    def test_password_reset_request_and_confirm(self, django_capture_on_commit_callbacks):
        User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )

        with django_capture_on_commit_callbacks(execute=True):
            request_response = self.client.post(
                "/api/auth/password-reset/",
                {"email": "tenant@example.com"},
                format="json",
            )

        assert request_response.status_code == 200
        assert PasswordResetToken.objects.count() == 1
        assert len(mail.outbox) == 1
        reset_url = [line for line in mail.outbox[0].body.splitlines() if "forgot-password?" in line][0]
        query = parse_qs(urlparse(reset_url).query)

        confirm_response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": query["uid"][0],
                "token": query["token"][0],
                "new_password": "NewPassword@123",
                "confirm_new_password": "NewPassword@123",
            },
            format="json",
        )

        assert confirm_response.status_code == 200
        reset_token = PasswordResetToken.objects.get()
        assert reset_token.used_at is not None

        login_response = self.client.post(
            "/api/auth/login/",
            {"identifier": "tenant@example.com", "password": "NewPassword@123"},
            format="json",
        )
        assert login_response.status_code == 200
        assert "access" in login_response.data["data"]
