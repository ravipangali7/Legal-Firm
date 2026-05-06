# Generated manually for NewsItem.body

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_image_fields_file_upload"),
    ]

    operations = [
        migrations.AddField(
            model_name="newsitem",
            name="body",
            field=models.TextField(
                blank=True,
                help_text="Full article text for the public detail page (optional; excerpt is used if empty).",
            ),
        ),
    ]
