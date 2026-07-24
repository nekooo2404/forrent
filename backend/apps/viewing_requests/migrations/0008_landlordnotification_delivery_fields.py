from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("viewing_requests", "0007_landlordnotification"),
    ]

    operations = [
        migrations.AddField(
            model_name="landlordnotification",
            name="delivery_attempted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="landlordnotification",
            name="email_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="landlordnotification",
            name="last_delivery_error",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="landlordnotification",
            name="telegram_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
