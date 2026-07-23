from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0007_demote_saler_superusers"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("TENANT", "Tenant"),
                    ("LANDLORD", "Landlord"),
                    ("SALER", "Saler/Admin"),
                ],
                default="TENANT",
                max_length=20,
            ),
        ),
    ]
