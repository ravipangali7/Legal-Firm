# Generated manually

from django.db import migrations, models

import core.models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0033_knowledgeresource"),
    ]

    operations = [
        migrations.AddField(
            model_name="knowledgeresource",
            name="pdf_file",
            field=models.FileField(
                blank=True,
                max_length=512,
                null=True,
                upload_to=core.models._upload_knowledge_pdf,
            ),
        ),
        migrations.AlterField(
            model_name="knowledgeresource",
            name="download_href",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Set automatically from uploaded PDF, or legacy absolute https / site-relative path.",
                max_length=1024,
            ),
        ),
    ]
