import secrets

import apps.rooms.models
from django.db import migrations, models


def populate_room_codes(apps, schema_editor):
    Room = apps.get_model("rooms", "Room")
    for room in Room.objects.filter(room_code__isnull=True).iterator(chunk_size=500):
        while True:
            room_code = f"FR-{secrets.token_hex(6).upper()}"
            if not Room.objects.filter(room_code=room_code).exists():
                break
        room.room_code = room_code
        room.save(update_fields=("room_code",))


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0010_room_hero_eligible_room_search_document"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="room_code",
            field=models.CharField(blank=True, editable=False, max_length=15, null=True),
        ),
        migrations.RunPython(populate_room_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="room",
            name="room_code",
            field=models.CharField(
                default=apps.rooms.models.generate_room_code,
                editable=False,
                max_length=15,
                unique=True,
            ),
        ),
    ]
