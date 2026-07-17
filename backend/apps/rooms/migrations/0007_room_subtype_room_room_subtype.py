from django.db import migrations, models
from django.db.models.deletion import PROTECT


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0006_room_water_billing_type_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="RoomSubtype",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "parent_type",
                    models.CharField(
                        choices=[("CCMN", "Chung cu mini"), ("CCDV", "Can ho dich vu"), ("HOUSE", "Nha nguyen can")],
                        max_length=20,
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ("parent_type", "name"),
            },
        ),
        migrations.AddConstraint(
            model_name="roomsubtype",
            constraint=models.UniqueConstraint(
                fields=("parent_type", "name"),
                name="rooms_subtype_parent_name_uniq",
            ),
        ),
        migrations.AddField(
            model_name="room",
            name="room_subtype",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=PROTECT,
                related_name="rooms",
                to="rooms.roomsubtype",
            ),
        ),
    ]
