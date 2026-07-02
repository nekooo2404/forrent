import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import PasswordResetToken
from apps.rooms.tests.factories import create_admin, create_user

User = get_user_model()


def otp_from_email(message):
    return message.body.split("Mã xác thực của bạn là: ")[1].splitlines()[0]


@pytest.mark.django_db
class TestAuthAPI:
    def setup_method(self):
        cache.clear()
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

    def test_register_rejects_duplicate_email_case_insensitive(self):
        User.objects.create_user(
            email="tenant@example.com",
            phone="0922222222",
            password="Password@123",
            full_name="Existing User",
        )

        response = self.client.post(
            "/api/auth/register/",
            {**self.payload, "email": "TENANT@example.com"},
            format="json",
        )

        assert response.status_code == 400
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

    def test_register_rejects_duplicate_phone_with_country_code(self):
        User.objects.create_user(
            email="other@example.com",
            phone="0382912254",
            password="Password@123",
            full_name="Existing User",
        )

        response = self.client.post(
            "/api/auth/register/",
            {**self.payload, "phone": "+84382912254"},
            format="json",
        )

        assert response.status_code == 400
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

    def test_refresh_token_returns_new_access_token(self):
        User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )
        login_response = self.client.post(
            "/api/auth/login/",
            {"identifier": "tenant@example.com", "password": "Password@123"},
            format="json",
        )

        response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": login_response.data["data"]["refresh"]},
            format="json",
        )

        assert response.status_code == 200
        assert "access" in response.data["data"]

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
                "email": "tenant@example.com",
            },
            format="json",
        )

        assert response.status_code == 200
        assert response.data["data"]["full_name"] == "Nguyen Van B"
        assert response.data["data"]["date_of_birth"] == "1999-02-02"
        tenant.refresh_from_db()
        assert tenant.email == "tenant@example.com"
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
        otp = otp_from_email(mail.outbox[0])

        confirm_response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "email": "tenant@example.com",
                "otp": otp,
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

    def test_register_requires_email_otp(self, django_capture_on_commit_callbacks):
        with django_capture_on_commit_callbacks(execute=True):
            otp_response = self.client.post(
                "/api/auth/otp/",
                {"email": "tenant@example.com", "purpose": "REGISTER"},
                format="json",
            )
        otp = otp_from_email(mail.outbox[0])

        missing_otp = self.client.post("/api/auth/register/", self.payload, format="json")
        valid_response = self.client.post(
            "/api/auth/register/",
            {**self.payload, "otp": otp},
            format="json",
        )

        assert otp_response.status_code == 200
        assert missing_otp.status_code == 400
        assert valid_response.status_code == 201
        assert User.objects.filter(email="tenant@example.com").exists()

    def test_profile_email_change_requires_otp(self, django_capture_on_commit_callbacks):
        tenant = User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )
        self.client.force_authenticate(tenant)

        missing_otp = self.client.put(
            "/api/auth/profile/",
            {
                "full_name": "Tenant",
                "date_of_birth": "2000-01-01",
                "phone": "0911111111",
                "email": "tenant-new@example.com",
            },
            format="json",
        )
        with django_capture_on_commit_callbacks(execute=True):
            self.client.post(
                "/api/auth/otp/",
                {"email": "tenant-new@example.com", "purpose": "CHANGE_EMAIL"},
                format="json",
            )
        otp = otp_from_email(mail.outbox[-1])
        valid_response = self.client.put(
            "/api/auth/profile/",
            {
                "full_name": "Tenant",
                "date_of_birth": "2000-01-01",
                "phone": "0911111111",
                "email": "tenant-new@example.com",
                "otp": otp,
            },
            format="json",
        )

        tenant.refresh_from_db()
        assert missing_otp.status_code == 400
        assert valid_response.status_code == 200
        assert tenant.email == "tenant-new@example.com"

    def test_change_password_requires_otp(self, django_capture_on_commit_callbacks):
        tenant = User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )
        self.client.force_authenticate(tenant)

        missing_otp = self.client.post(
            "/api/auth/change-password/",
            {
                "old_password": "Password@123",
                "new_password": "NewPassword@123",
                "confirm_new_password": "NewPassword@123",
            },
            format="json",
        )
        with django_capture_on_commit_callbacks(execute=True):
            self.client.post(
                "/api/auth/otp/",
                {"email": "tenant@example.com", "purpose": "CHANGE_PASSWORD"},
                format="json",
            )
        otp = otp_from_email(mail.outbox[-1])
        valid_response = self.client.post(
            "/api/auth/change-password/",
            {
                "old_password": "Password@123",
                "new_password": "NewPassword@123",
                "confirm_new_password": "NewPassword@123",
                "otp": otp,
            },
            format="json",
        )

        assert missing_otp.status_code == 400
        assert valid_response.status_code == 200

    def test_saler_admin_can_create_tenant_user(self):
        saler = create_admin()
        self.client.force_authenticate(saler)

        response = self.client.post(
            "/api/admin/users/",
            {
                "full_name": "New Tenant",
                "phone": "0987654321",
                "email": "new-tenant@example.com",
                "role": User.Role.TENANT,
                "password": "Password@123",
            },
            format="json",
        )

        assert response.status_code == 201
        assert response.data["data"]["role"] == User.Role.TENANT
        assert User.objects.filter(email="new-tenant@example.com", role=User.Role.TENANT).exists()

    def test_creating_saler_requires_current_admin_password(self):
        saler = create_admin()
        self.client.force_authenticate(saler)

        missing_password = self.client.post(
            "/api/admin/users/",
            {
                "full_name": "New Saler",
                "phone": "0987654322",
                "email": "new-saler@example.com",
                "role": User.Role.SALER,
                "password": "Password@123",
            },
            format="json",
        )
        valid_response = self.client.post(
            "/api/admin/users/",
            {
                "full_name": "New Saler",
                "phone": "0987654322",
                "email": "new-saler@example.com",
                "role": User.Role.SALER,
                "password": "Password@123",
                "current_password": "Password@123",
            },
            format="json",
        )

        assert missing_password.status_code == 400
        assert "current_password" in missing_password.data["errors"]
        assert valid_response.status_code == 201
        assert valid_response.data["data"]["role"] == User.Role.SALER

    def test_changing_user_role_or_password_requires_current_admin_password(self):
        saler = create_admin()
        tenant = create_user(email="change-me@example.com", phone="0987654323")
        self.client.force_authenticate(saler)

        missing_password = self.client.patch(
            f"/api/admin/users/{tenant.id}/",
            {"role": User.Role.SALER},
            format="json",
        )
        valid_response = self.client.patch(
            f"/api/admin/users/{tenant.id}/",
            {"role": User.Role.SALER, "current_password": "Password@123"},
            format="json",
        )

        tenant.refresh_from_db()
        assert missing_password.status_code == 400
        assert "current_password" in missing_password.data["errors"]
        assert valid_response.status_code == 200
        assert tenant.role == User.Role.SALER
        assert tenant.admin_updated_by == saler

    def test_tenant_cannot_manage_users(self):
        tenant = create_user(email="tenant2@example.com", phone="0944444444")
        self.client.force_authenticate(tenant)

        response = self.client.get("/api/admin/users/")

        assert response.status_code == 403
