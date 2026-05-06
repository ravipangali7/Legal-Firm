# Generated manually for Professionals page API + team years.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0021_alter_appsettings_payments_enabled"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProfessionalsPageConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "hero_title",
                    models.CharField(default="Our Professionals", max_length=255),
                ),
                (
                    "hero_subtitle",
                    models.TextField(
                        default=(
                            "Experienced advocates and chartered accountants dedicated to delivering excellence "
                            "in Nepalese law and taxation."
                        )
                    ),
                ),
                ("stat_professionals_label", models.CharField(blank=True, max_length=128)),
                ("stat_experience_label", models.CharField(blank=True, max_length=128)),
                ("stat_practice_label", models.CharField(blank=True, max_length=128)),
            ],
            options={
                "verbose_name": "Professionals page",
                "verbose_name_plural": "Professionals page",
            },
        ),
        migrations.AddField(
            model_name="teammember",
            name="years_experience",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text="Years in practice; summed with other enabled members for the public Professionals page stat.",
            ),
        ),
    ]
