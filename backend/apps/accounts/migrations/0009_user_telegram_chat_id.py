import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0008_add_landlord_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="telegram_chat_id",
            field=models.CharField(
                blank=True,
                max_length=32,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Telegram Chat ID must contain only an optional leading minus sign and digits.",
                        regex="^-?\\d{1,20}$",
                    )
                ],
            ),
        ),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(
                condition=~models.Q(telegram_chat_id=""),
                fields=("telegram_chat_id",),
                name="unique_nonempty_telegram_chat_id",
            ),
        ),
    ]
