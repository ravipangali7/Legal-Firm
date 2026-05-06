# Generated manually for TeamMember social / contact fields.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_otp_verification"),
    ]

    operations = [
        migrations.AddField(
            model_name="teammember",
            name="linkedin_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="teammember",
            name="facebook_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="teammember",
            name="twitter_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="teammember",
            name="instagram_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="teammember",
            name="contact_email",
            field=models.EmailField(blank=True, max_length=254),
        ),
    ]
