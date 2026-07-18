from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.rooms.models import RoomImage
from apps.rooms.tests.factories import create_room


@pytest.mark.django_db
def test_public_room_quality_audit_passes_for_clean_room():
    room = create_room()
    room.title = "Studio gan cong vien Yen So"
    room.thumbnail = "room-thumbnails/studio-yen-so.jpg"
    room.save(update_fields=("title", "thumbnail", "updated_at"))
    RoomImage.objects.create(
        room=room,
        image_url="https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/rooms/studio-yen-so.jpg",
        media_type=RoomImage.MediaType.IMAGE,
    )

    stdout = StringIO()
    call_command("audit_public_room_quality", stdout=stdout)

    assert "checked=1 issues=0" in stdout.getvalue()


@pytest.mark.django_db
def test_public_room_quality_audit_fails_for_bad_public_listing_copy_and_missing_media():
    room = create_room()
    room.title = "P502 CCMN KHAI TRUONG SIEU PHAM 🎉"
    room.thumbnail = ""
    room.save(update_fields=("title", "thumbnail", "updated_at"))

    stdout = StringIO()
    with pytest.raises(CommandError, match="Public room quality audit failed"):
        call_command("audit_public_room_quality", stdout=stdout)

    output = stdout.getvalue()
    assert "title contains emoji" in output
    assert "title starts with an internal room code" in output
    assert "title contains internal abbreviation CCMN" in output
    assert "missing thumbnail" in output
    assert "gallery needs at least one still image" in output


@pytest.mark.django_db
def test_public_room_quality_audit_rejects_unapproved_absolute_media_hosts():
    room = create_room()
    room.title = "Can ho dich vu gan Sakura"
    room.thumbnail = "room-thumbnails/sakura.jpg"
    room.save(update_fields=("title", "thumbnail", "updated_at"))
    RoomImage.objects.create(
        room=room,
        image_url="https://example.com/room.jpg",
        media_type=RoomImage.MediaType.IMAGE,
    )

    stdout = StringIO()
    with pytest.raises(CommandError, match="Public room quality audit failed"):
        call_command("audit_public_room_quality", stdout=stdout)

    assert "uses an unapproved media host" in stdout.getvalue()


@pytest.mark.django_db
def test_sanitize_public_room_titles_is_dry_run_by_default():
    room = create_room()
    room.title = "P302 - Gác xép 🎉"
    room.save(update_fields=("title", "updated_at"))

    stdout = StringIO()
    call_command("sanitize_public_room_titles", stdout=stdout)

    room.refresh_from_db()
    assert room.title == "P302 - Gác xép 🎉"
    assert "mode=dry_run checked=1 changed=1" in stdout.getvalue()


@pytest.mark.django_db
def test_sanitize_public_room_titles_apply_updates_room_title():
    room = create_room()
    room.title = "P302 - Gác xép 🎉"
    room.save(update_fields=("title", "updated_at"))

    stdout = StringIO()
    call_command("sanitize_public_room_titles", "--apply", stdout=stdout)

    room.refresh_from_db()
    assert room.title == "Gác xép"
    assert "mode=applied checked=1 changed=1" in stdout.getvalue()
