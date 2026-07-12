import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import PasswordResetToken
from apps.common.models import AuditLog
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

    def test_create_superuser_does_not_assign_saler_role(self):
        user = User.objects.create_superuser(
            email="root@example.com",
            phone="0933333333",
            password="Password@123",
            full_name="Root User",
        )

        assert user.role == User.Role.TENANT
        assert user.is_staff is True
        assert user.is_superuser is True

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
        assert AuditLog.objects.filter(event="auth.login_succeeded", status=AuditLog.Status.SUCCESS).exists()

    def test_failed_login_writes_audit_log_without_raw_identifier(self):
        User.objects.create_user(
            email="tenant@example.com",
            phone="0911111111",
            password="Password@123",
            full_name="Tenant",
        )

        response = self.client.post(
            "/api/auth/login/",
            {"identifier": "tenant@example.com", "password": "WrongPassword@123"},
            format="json",
        )

        log = AuditLog.objects.get(event="auth.login_failed")
        assert response.status_code == 401
        assert log.status == AuditLog.Status.FAILURE
        assert log.metadata["identifier_hash"] != "tenant@example.com"

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

    def test_logout_revokes_refresh_without_valid_access_token(self):
        User.objects.create_user(
            email="logout@example.com",
            phone="0911222444",
            password="Password@123",
            full_name="Logout User",
        )
        login_response = self.client.post(
            "/api/auth/login/",
            {"identifier": "logout@example.com", "password": "Password@123"},
            format="json",
        )
        refresh = login_response.data["data"]["refresh"]

        logout_response = self.client.post("/api/auth/logout/", {"refresh": refresh}, format="json")
        refresh_response = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")

        assert logout_response.status_code == 200
        assert refresh_response.status_code == 401

    def test_password_change_invalidates_existing_access_token(self):
        user = User.objects.create_user(
            email="revoke@example.com",
            phone="0911222555",
            password="Password@123",
            full_name="Revoke User",
        )
        login_response = self.client.post(
            "/api/auth/login/",
            {"identifier": user.email, "password": "Password@123"},
            format="json",
        )
        access = login_response.data["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        assert self.client.get("/api/auth/me/").status_code == 200

        user.set_password("NewPassword@123")
        user.save(update_fields=["password", "updated_at"])

        assert self.client.get("/api/auth/me/").status_code == 401

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
        assert AuditLog.objects.filter(event="auth.password_changed", actor=tenant).exists()

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
        created_saler = User.objects.get(email="new-saler@example.com")
        assert created_saler.is_staff is True
        assert created_saler.is_superuser is False

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
        assert tenant.is_staff is True
        assert tenant.is_superuser is False
        assert tenant.admin_updated_by == saler
        log = AuditLog.objects.get(event="admin.resource_updated", target_id=str(tenant.id))
        assert log.actor == saler
        assert "role" in log.metadata["fields"]
        assert "current_password" not in log.metadata["fields"]
        role_log = AuditLog.objects.get(event="admin.user_role_changed", target_id=str(tenant.id))
        assert role_log.metadata == {"from": User.Role.TENANT, "to": User.Role.SALER}

    def test_admin_password_change_for_user_writes_specific_audit_log(self):
        saler = create_admin()
        tenant = create_user(email="password-target@example.com", phone="0987654324")
        self.client.force_authenticate(saler)

        response = self.client.patch(
            f"/api/admin/users/{tenant.id}/",
            {"password": "NewPassword@123", "current_password": "Password@123"},
            format="json",
        )

        assert response.status_code == 200
        assert AuditLog.objects.filter(event="admin.user_password_changed", actor=saler, target_id=str(tenant.id)).exists()

    def test_last_active_saler_cannot_be_demoted_or_deactivated(self):
        saler = create_admin()
        self.client.force_authenticate(saler)

        demote_response = self.client.patch(
            f"/api/admin/users/{saler.id}/",
            {"role": User.Role.TENANT, "current_password": "Password@123"},
            format="json",
        )
        deactivate_response = self.client.patch(
            f"/api/admin/users/{saler.id}/",
            {"is_active": False},
            format="json",
        )

        assert demote_response.status_code == 400
        assert deactivate_response.status_code == 400
        saler.refresh_from_db()
        assert saler.role == User.Role.SALER
        assert saler.is_active is True

    def test_tenant_cannot_manage_users(self):
        tenant = create_user(email="tenant2@example.com", phone="0944444444")
        self.client.force_authenticate(tenant)

        response = self.client.get("/api/admin/users/")

        assert response.status_code == 403
