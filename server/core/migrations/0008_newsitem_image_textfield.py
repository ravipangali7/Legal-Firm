from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0007_help_article"),
    ]

    operations = [
        migrations.AlterField(
            model_name="newsitem",
            name="image",
            field=models.TextField(blank=True),
        ),
    ]
