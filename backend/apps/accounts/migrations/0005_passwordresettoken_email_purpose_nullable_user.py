import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_user_admin_updated_by"),
    ]

    operations = [
        migrations.AlterField(
            model_name="passwordresettoken",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="password_reset_tokens",
                to="accounts.user",
            ),
        ),
        migrations.AddField(
            model_name="passwordresettoken",
            name="email",
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name="passwordresettoken",
            name="purpose",
            field=models.CharField(
                choices=[
                    ("REGISTER", "Register"),
                    ("PASSWORD_RESET", "Password reset"),
                    ("CHANGE_EMAIL", "Change email"),
                    ("CHANGE_PASSWORD", "Change password"),
                ],
                default="PASSWORD_RESET",
                max_length=32,
            ),
        ),
        migrations.AddIndex(
            model_name="passwordresettoken",
            index=models.Index(
                fields=["email", "purpose", "used_at", "expires_at"],
                name="accounts_otp_lookup_idx",
            ),
        ),
    ]
