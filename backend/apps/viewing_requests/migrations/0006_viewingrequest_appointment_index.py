from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("viewing_requests", "0005_enterprise_lifecycle_status"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="viewingrequest",
            index=models.Index(fields=["appointment_date"], name="viewing_appointment_idx"),
        ),
    ]
