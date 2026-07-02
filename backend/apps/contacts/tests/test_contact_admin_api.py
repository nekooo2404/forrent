import pytest
from rest_framework.test import APIClient

from apps.contacts.models import ContactMessage
from apps.rooms.tests.factories import create_admin, create_room
from apps.viewing_requests.models import ViewingRequest


@pytest.mark.django_db
class TestContactAdminAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_admin_can_convert_contact_to_viewing_request(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        contact = ContactMessage.objects.create(
            full_name="Nguyen Van A",
            phone="0912345678",
            email="tenant-a@example.com",
            message="Toi muon xem phong nay",
            room=room,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(f"/api/admin/contacts/{contact.id}/convert-to-lead/")

        assert response.status_code == 200
        contact.refresh_from_db()
        lead = ViewingRequest.objects.get(id=response.data["data"]["viewing_request_id"])
        assert lead.room == room
        assert lead.full_name == contact.full_name
        assert lead.phone == contact.phone
        assert lead.email == contact.email
        assert contact.status == ContactMessage.Status.HANDLED
        assert contact.converted_viewing_request == lead

    def test_public_contact_can_include_interested_room(self):
        room = create_room()

        response = self.client.post(
            "/api/contact/",
            {
                "full_name": "Nguyen Van B",
                "phone": "0912345679",
                "email": "tenant-b@example.com",
                "message": "Toi muon duoc tu van phong nay",
                "room_id": room.id,
            },
            format="json",
        )

        assert response.status_code == 201
        contact = ContactMessage.objects.get(phone="0912345679")
        assert contact.room == room

    def test_contact_without_email_cannot_be_converted_to_placeholder_user(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        contact = ContactMessage.objects.create(
            full_name="Nguyen Van C",
            phone="0912345680",
            email="",
            message="Toi muon xem phong nay",
            room=room,
        )
        self.client.force_authenticate(admin)

        response = self.client.post(f"/api/admin/contacts/{contact.id}/convert-to-lead/")

        assert response.status_code == 400
        assert "email" in response.data["errors"]

    def test_admin_bulk_update_contacts_is_atomic(self):
        admin = create_admin()
        contacts = [
            ContactMessage.objects.create(
                full_name=f"Tenant {index}",
                phone=f"09123456{index:02d}",
                email=f"tenant-{index}@example.com",
                message="Can tu van phong",
            )
            for index in range(2)
        ]
        self.client.force_authenticate(admin)

        response = self.client.post(
            "/api/admin/contacts/bulk-update/",
            {"ids": [contact.id for contact in contacts], "status": ContactMessage.Status.READ},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["data"]["updated_count"] == 2
        assert set(ContactMessage.objects.filter(id__in=[contact.id for contact in contacts]).values_list("status", flat=True)) == {
            ContactMessage.Status.READ
        }
