from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0007_room_subtype_room_room_subtype"),
    ]

    operations = [
        migrations.AddField(
            model_name="room",
            name="building_code",
            field=models.CharField(blank=True, db_index=True, max_length=50),
        ),
        migrations.AddIndex(
            model_name="room",
            index=models.Index(fields=["status", "room_subtype"], name="rooms_status_subtype_idx"),
        ),
    ]
