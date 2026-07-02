from django.db import migrations


def normalize_users(apps, _schema_editor):
    User = apps.get_model("accounts", "User")
    for user in User.objects.all().iterator():
        email = (user.email or "").strip().lower()
        phone = (user.phone or "").strip().replace(" ", "").replace("-", "").replace(".", "")
        if phone.startswith("+84"):
            phone = f"0{phone[3:]}"
        if email != user.email or phone != user.phone:
            user.email = email
            user.phone = phone
            user.save(update_fields=["email", "phone"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_passwordresettoken_email_purpose_nullable_user"),
    ]

    operations = [
        migrations.RunPython(normalize_users, migrations.RunPython.noop),
    ]
