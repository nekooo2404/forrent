from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.cache import cache
from rest_framework import serializers
from rest_framework.test import APIClient

from apps.common.models import AuditLog
from apps.common.image_validation import validate_uploaded_image_file, validate_uploaded_room_media_file
from apps.rooms.tests.factories import create_admin, create_room, create_user
from apps.locations.models import AreaRange
from apps.rooms.models import DepositType, Room, RoomImage, RoomSubtype
from apps.rooms.serializers import validate_room_image_url
from apps.viewing_requests.models import ViewingRequest

User = get_user_model()


@pytest.mark.django_db
class TestRoomAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_public_room_api_does_not_return_internal_note_or_commission_data(self):
        room = create_room()

        response = self.client.get(f"/api/rooms/{room.slug}/")

        assert response.status_code == 200
        data = response.json()["data"]
        assert "internal_note" not in data
        assert "commission_percent" not in data
        assert "commission_base_amount" not in data
        assert "estimated_commission_amount" not in data
        assert data["deposit_type_name"] == "Cọc 1 tháng"
        assert data["deposit_amount"] == "5000000.00"
        assert data["electricity_price_per_kwh"] == "4000.00"
        assert data["water_price_per_person"] == "100000.00"
        assert data["service_fee"] == "150000.00"

    def test_public_room_api_exposes_clean_public_title_without_changing_admin_title(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        room.title = "P302 - Gác xép 🎉"
        room.save(update_fields=("title", "updated_at"))

        public_response = self.client.get(f"/api/rooms/{room.slug}/")
        self.client.force_authenticate(admin)
        admin_response = self.client.get(f"/api/admin/rooms/{room.id}/")

        assert public_response.status_code == 200
        assert public_response.data["data"]["title"] == "P302 - Gác xép 🎉"
        assert public_response.data["data"]["public_title"] == "Gác xép"
        assert admin_response.status_code == 200
        assert admin_response.data["data"]["title"] == "P302 - Gác xép 🎉"
        assert admin_response.data["data"]["public_title"] == "Gác xép"

    def test_building_code_is_admin_only_and_searchable(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        self.client.force_authenticate(admin)

        update_response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {"building_code": " s3.02 "},
            format="json",
        )
        search_response = self.client.get("/api/admin/rooms/?search=S3.02")
        public_response = self.client.get(f"/api/rooms/{room.slug}/")

        assert update_response.status_code == 200
        assert update_response.data["data"]["building_code"] == "S3.02"
        assert [item["id"] for item in search_response.data["data"]["results"]] == [room.id]
        assert "building_code" not in public_response.data["data"]

    def test_admin_can_set_water_price_per_cubic_meter(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {
                "water_billing_type": "PER_CUBIC_METER",
                "water_price_per_cubic_meter": "25000",
            },
            format="json",
        )

        assert response.status_code == 200
        room.refresh_from_db()
        assert room.water_billing_type == Room.WaterBillingType.PER_CUBIC_METER
        assert room.water_price_per_cubic_meter == 25000

        public_response = self.client.get(f"/api/rooms/{room.slug}/")
        data = public_response.json()["data"]
        assert data["water_billing_type"] == "PER_CUBIC_METER"
        assert data["water_price_per_cubic_meter"] == "25000.00"

    def test_public_room_list_hides_unavailable_rooms(self):
        available_room = create_room()
        unavailable_room = create_room(status=Room.Status.RENTED)

        response = self.client.get("/api/rooms/")

        assert response.status_code == 200
        slugs = {room["slug"] for room in response.json()["data"]["results"]}
        assert available_room.slug in slugs
        assert unavailable_room.slug not in slugs

    def test_public_room_list_uses_first_gallery_image_as_thumbnail_fallback(self):
        room = create_room()
        RoomImage.objects.create(
            room=room,
            image_url="https://res.cloudinary.com/demo/video/upload/v1/room-tour.mp4",
            media_type=RoomImage.MediaType.VIDEO,
            sort_order=0,
        )
        RoomImage.objects.create(
            room=room,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/room-main.jpg",
            media_type=RoomImage.MediaType.IMAGE,
            sort_order=1,
        )

        response = self.client.get("/api/rooms/")

        assert response.status_code == 200
        item = next(item for item in response.json()["data"]["results"] if item["slug"] == room.slug)
        assert item["thumbnail_url"] == "https://res.cloudinary.com/demo/image/upload/v1/room-main.jpg"

    def test_room_keeps_deposit_type_snapshot_after_type_rename(self):
        room = create_room()
        deposit_type = room.deposit_type
        deposit_type.name = "Cọc linh hoạt"
        deposit_type.save(update_fields=["name", "updated_at"])

        response = self.client.get(f"/api/rooms/{room.slug}/")

        assert response.status_code == 200
        assert response.json()["data"]["deposit_type_name"] == "Cọc 1 tháng"

    def test_tenant_cannot_access_admin_api(self):
        tenant = create_user()
        self.client.force_authenticate(tenant)

        response = self.client.get("/api/admin/rooms/")

        assert response.status_code == 403

    def test_admin_can_access_admin_api(self):
        admin = create_admin()
        self.client.force_authenticate(admin)

        response = self.client.get("/api/admin/rooms/")

        assert response.status_code == 200

    def test_saler_admin_can_access_admin_operations(self):
        saler = create_user(email="saler@example.com", phone="0922222222", role=User.Role.SALER)
        self.client.force_authenticate(saler)

        allowed_urls = [
            "/api/admin/viewing-requests/",
            "/api/admin/contacts/",
            "/api/admin/rooms/",
            "/api/admin/blogs/",
            "/api/admin/cities/",
            "/api/admin/deposit-types/",
            "/api/admin/commissions/summary/",
            "/api/admin/dashboard/summary/",
        ]

        for url in allowed_urls:
            assert self.client.get(url).status_code == 200

    def test_admin_can_manage_room_subtypes_and_public_filters_expose_active_values(self):
        admin = create_admin()
        self.client.force_authenticate(admin)

        response = self.client.post(
            "/api/admin/room-subtypes/",
            {"parent_type": Room.RoomType.CCDV, "name": "Studio"},
            format="json",
        )

        assert response.status_code == 201
        subtype_id = response.data["data"]["id"]
        cache.clear()
        filters_response = self.client.get("/api/rooms/filters/")

        assert filters_response.status_code == 200
        assert {item["id"] for item in filters_response.data["data"]["room_subtypes"]} == {subtype_id}

        update_response = self.client.patch(
            f"/api/admin/room-subtypes/{subtype_id}/",
            {"name": "1N1K"},
            format="json",
        )
        assert update_response.status_code == 200

    def test_room_rejects_subtype_from_another_parent_type(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        subtype = RoomSubtype.objects.create(parent_type=Room.RoomType.CCDV, name="Studio")
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {"room_subtype": subtype.id},
            format="json",
        )

        assert response.status_code == 400
        assert "room_subtype" in response.data["errors"]

    def test_admin_cannot_change_parent_type_of_used_subtype(self):
        admin = create_admin()
        subtype = RoomSubtype.objects.create(parent_type=Room.RoomType.CCMN, name="Studio")
        room = create_room(created_by=admin)
        room.room_subtype = subtype
        room.save(update_fields=("room_subtype", "updated_at"))
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/room-subtypes/{subtype.id}/",
            {"parent_type": Room.RoomType.CCDV},
            format="json",
        )

        assert response.status_code == 400
        assert "parent_type" in response.data["errors"]

    def test_public_rooms_can_filter_by_subtype(self):
        subtype = RoomSubtype.objects.create(parent_type=Room.RoomType.CCMN, name="1N1K")
        room = create_room()
        room.room_subtype = subtype
        room.save(update_fields=("room_subtype", "updated_at"))

        response = self.client.get(f"/api/rooms/?room_subtype={subtype.id}")

        assert response.status_code == 200
        assert [item["id"] for item in response.data["data"]["results"]] == [room.id]

    def test_admin_room_validation_rejects_area_outside_range_and_large_commission(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        small_range = AreaRange.objects.create(name="10-15m2", min_area="10", max_area="15")
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {
                "actual_area": "25",
                "area_range": small_range.id,
                "commission_percent": "150",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "actual_area" in response.data["errors"]
        assert "commission_percent" in response.data["errors"]

    def test_admin_room_status_change_writes_specific_audit_log(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {"status": Room.Status.HIDDEN},
            format="json",
        )

        assert response.status_code == 200
        log = AuditLog.objects.get(event="room.status_changed", target_id=str(room.id))
        assert log.metadata == {"from": Room.Status.PUBLISHED, "to": Room.Status.HIDDEN}

    def test_admin_cannot_mark_room_rented_without_lead_conversion(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {"status": Room.Status.RENTED},
            format="json",
        )

        assert response.status_code == 400
        room.refresh_from_db()
        assert room.status == Room.Status.PUBLISHED

    def test_admin_cannot_republish_rented_room_without_move_out(self):
        admin = create_admin()
        room = create_room(created_by=admin, status=Room.Status.RENTED)
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {"status": Room.Status.PUBLISHED},
            format="json",
        )

        assert response.status_code == 400
        room.refresh_from_db()
        assert room.status == Room.Status.RENTED

    def test_admin_can_archive_rented_room(self):
        admin = create_admin()
        room = create_room(created_by=admin, status=Room.Status.RENTED)
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {"status": Room.Status.ARCHIVED},
            format="json",
        )

        assert response.status_code == 200
        room.refresh_from_db()
        assert room.status == Room.Status.ARCHIVED
        assert AuditLog.objects.filter(
            event="room.status_changed",
            target_id=str(room.id),
            metadata={"from": Room.Status.RENTED, "to": Room.Status.ARCHIVED},
        ).exists()

    def test_admin_delete_room_with_viewing_history_returns_conflict(self):
        admin = create_admin()
        tenant = create_user(email="delete-history@example.com", phone="0912345699")
        room = create_room(created_by=admin)
        ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=tenant.full_name,
            phone=tenant.phone,
            email=tenant.email,
        )
        self.client.force_authenticate(admin)

        response = self.client.delete(f"/api/admin/rooms/{room.id}/")

        assert response.status_code == 409
        assert Room.objects.filter(pk=room.pk).exists()

    def test_room_image_validation_rejects_svg_upload(self):
        image = SimpleUploadedFile("bad.svg", b"<svg></svg>", content_type="image/svg+xml")

        with pytest.raises(serializers.ValidationError):
            validate_uploaded_image_file(image, "uploaded_images")

    def test_room_media_validation_accepts_mp4_and_rejects_spoofed_video(self):
        mp4 = SimpleUploadedFile(
            "tour.mp4",
            b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64,
            content_type="video/mp4",
        )
        spoofed = SimpleUploadedFile("tour.mp4", b"not-a-video", content_type="video/mp4")

        assert validate_uploaded_room_media_file(mp4, "uploaded_images") == "VIDEO"
        with pytest.raises(serializers.ValidationError):
            validate_uploaded_room_media_file(spoofed, "uploaded_images")

    def test_admin_can_upload_room_video(self, tmp_path, settings):
        settings.MEDIA_ROOT = tmp_path
        admin = create_admin()
        room = create_room(created_by=admin)
        self.client.force_authenticate(admin)
        video = SimpleUploadedFile(
            "tour.mp4",
            b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64,
            content_type="video/mp4",
        )

        with mock.patch("cloudinary.uploader.upload"):
            response = self.client.patch(
                f"/api/admin/rooms/{room.id}/",
                {"uploaded_images": [video]},
                format="multipart",
            )

        assert response.status_code == 200
        media = RoomImage.objects.get(room=room)
        assert media.media_type == RoomImage.MediaType.VIDEO
        assert media.image.name.startswith("room-videos/")

    def test_admin_can_label_room_media_for_renter_facing_gallery(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        media = RoomImage.objects.create(
            room=room,
            image_url="https://res.cloudinary.com/demo/image/upload/v1/room-kitchen.jpg",
            media_type=RoomImage.MediaType.IMAGE,
        )
        self.client.force_authenticate(admin)

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/images/{media.id}/",
            {"label": "KITCHEN"},
            format="json",
        )
        public_response = self.client.get(f"/api/rooms/{room.slug}/")

        assert response.status_code == 200
        assert response.data["data"]["label"] == "KITCHEN"
        assert public_response.data["data"]["images"][0]["label"] == "KITCHEN"
        assert AuditLog.objects.filter(event="room.image_updated", target_id=str(room.id)).exists()

    def test_admin_rejected_room_upload_writes_audit_log(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        self.client.force_authenticate(admin)
        image = SimpleUploadedFile("bad.svg", b"<svg></svg>", content_type="image/svg+xml")

        response = self.client.patch(
            f"/api/admin/rooms/{room.id}/",
            {"uploaded_images": [image]},
            format="multipart",
        )

        assert response.status_code == 400
        log = AuditLog.objects.get(event="room.upload_rejected", target_id=str(room.id))
        assert log.status == AuditLog.Status.FAILURE
        assert log.metadata["fields"] == ["uploaded_images"]
        assert log.metadata["uploaded_image_count"] == 1

    def test_admin_deposit_type_crud_writes_audit_logs(self):
        admin = create_admin()
        self.client.force_authenticate(admin)

        create_response = self.client.post("/api/admin/deposit-types/", {"name": "Cọc test"}, format="json")
        deposit_type_id = create_response.data["data"]["id"]
        update_response = self.client.patch(
            f"/api/admin/deposit-types/{deposit_type_id}/",
            {"name": "Cọc test sửa"},
            format="json",
        )
        delete_response = self.client.delete(f"/api/admin/deposit-types/{deposit_type_id}/")

        assert create_response.status_code == 201
        assert update_response.status_code == 200
        assert delete_response.status_code == 200
        assert AuditLog.objects.filter(event="deposit_type.created", target_id=str(deposit_type_id)).exists()
        assert AuditLog.objects.filter(event="deposit_type.updated", target_id=str(deposit_type_id)).exists()
        assert AuditLog.objects.filter(event="deposit_type.deleted", target_id=str(deposit_type_id)).exists()

    def test_used_deposit_type_delete_deactivates_and_writes_audit_log(self):
        admin = create_admin()
        room = create_room(created_by=admin)
        deposit_type = room.deposit_type
        self.client.force_authenticate(admin)

        response = self.client.delete(f"/api/admin/deposit-types/{deposit_type.id}/")

        assert response.status_code == 200
        deposit_type.refresh_from_db()
        assert not deposit_type.is_active
        assert DepositType.objects.filter(id=deposit_type.id).exists()
        assert AuditLog.objects.filter(event="deposit_type.deactivated", target_id=str(deposit_type.id)).exists()

    def test_room_image_url_rejects_unapproved_host(self):
        with pytest.raises(serializers.ValidationError):
            validate_room_image_url("https://untrusted.example/photo.jpg")
