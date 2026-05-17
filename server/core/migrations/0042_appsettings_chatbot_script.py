from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0041_alter_emailtemplate_description_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsettings",
            name="chatbot_script",
            field=models.TextField(
                blank=True,
                help_text="Third-party chat widget embed code (script tags). Injected on every public page.",
            ),
        ),
    ]
