from django.db import migrations, models


def forwards(apps, schema_editor):
    Room = apps.get_model("rooms", "Room")
    legacy_status_map = {
        "AVAILABLE": "PUBLISHED",
        "UNAVAILABLE": "RENTED",
    }
    for legacy_status, next_status in legacy_status_map.items():
        Room.objects.filter(status=legacy_status).update(status=next_status)

    for room in Room.objects.select_related("deposit_type").only("id", "deposit_type", "deposit_type_name_snapshot"):
        if room.deposit_type_id and not room.deposit_type_name_snapshot:
            room.deposit_type_name_snapshot = room.deposit_type.name
            room.save(update_fields=["deposit_type_name_snapshot", "updated_at"])


def backwards(apps, schema_editor):
    Room = apps.get_model("rooms", "Room")
    reverse_status_map = {
        "PUBLISHED": "AVAILABLE",
        "RENTED": "UNAVAILABLE",
        "DRAFT": "HIDDEN",
        "PENDING_REVIEW": "HIDDEN",
        "ARCHIVED": "HIDDEN",
    }
    for current_status, legacy_status in reverse_status_map.items():
        Room.objects.filter(status=current_status).update(status=legacy_status)


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0003_deposittype_room_deposit_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="deposit_type_name_snapshot",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="room",
            name="status",
            field=models.CharField(
                choices=[
                    ("DRAFT", "Draft"),
                    ("PENDING_REVIEW", "Pending review"),
                    ("PUBLISHED", "Published"),
                    ("RENTED", "Rented"),
                    ("HIDDEN", "Hidden"),
                    ("ARCHIVED", "Archived"),
                ],
                default="DRAFT",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]
