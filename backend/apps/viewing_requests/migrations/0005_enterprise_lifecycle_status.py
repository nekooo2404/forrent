from django.db import migrations, models


def forwards(apps, schema_editor):
    ViewingRequest = apps.get_model("viewing_requests", "ViewingRequest")
    status_map = {
        "MOVED_IN": "CONVERTED",
        "NOT_MOVED_IN": "NO_SHOW",
    }
    for old_status, new_status in status_map.items():
        ViewingRequest.objects.filter(status=old_status).update(status=new_status)


def backwards(apps, schema_editor):
    ViewingRequest = apps.get_model("viewing_requests", "ViewingRequest")
    status_map = {
        "CONVERTED": "MOVED_IN",
        "NO_SHOW": "NOT_MOVED_IN",
        "SCHEDULED": "CONTACTED",
    }
    for current_status, legacy_status in status_map.items():
        ViewingRequest.objects.filter(status=current_status).update(status=legacy_status)


class Migration(migrations.Migration):
    dependencies = [
        ("viewing_requests", "0004_viewingrequest_appointment_date_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="viewingrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("NEW", "New"),
                    ("CONTACTED", "Contacted"),
                    ("SCHEDULED", "Scheduled"),
                    ("VIEWED", "Viewed"),
                    ("CONVERTED", "Converted"),
                    ("CANCELLED", "Cancelled"),
                    ("NO_SHOW", "No show"),
                ],
                default="NEW",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]
