# Generated manually for testimonials section heading

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_teammember_social_links"),
    ]

    operations = [
        migrations.AddField(
            model_name="testimonialsconfig",
            name="title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
