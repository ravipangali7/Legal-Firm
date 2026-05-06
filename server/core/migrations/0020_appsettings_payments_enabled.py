from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0019_summary_engagement"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsettings",
            name="payments_enabled",
            field=models.BooleanField(default=False),
        ),
    ]
