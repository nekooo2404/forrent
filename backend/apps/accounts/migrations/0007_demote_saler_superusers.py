from django.db import migrations


def demote_saler_superusers(apps, schema_editor):
    user_model = apps.get_model("accounts", "User")
    user_model.objects.filter(role="SALER", is_superuser=True).update(is_superuser=False, is_staff=True)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0006_normalize_user_email_phone"),
    ]

    operations = [
        migrations.RunPython(demote_saler_superusers, migrations.RunPython.noop),
    ]
