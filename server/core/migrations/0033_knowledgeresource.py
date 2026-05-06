# Generated manually for KnowledgeResource

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0032_notice"),
    ]

    operations = [
        migrations.CreateModel(
            name="KnowledgeResource",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=512)),
                ("description", models.TextField(blank=True)),
                ("category", models.CharField(max_length=64)),
                (
                    "download_href",
                    models.CharField(
                        help_text="Absolute https URL or a site-relative path such as /media/...",
                        max_length=1024,
                    ),
                ),
                ("file_type", models.CharField(default="PDF", max_length=16)),
                (
                    "file_size_label",
                    models.CharField(
                        blank=True,
                        help_text='Display only, e.g. "2.5 MB".',
                        max_length=32,
                    ),
                ),
                ("download_count", models.PositiveIntegerField(default=0)),
                ("published", models.BooleanField(default=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Knowledge resource",
                "verbose_name_plural": "Knowledge resources",
                "ordering": ["sort_order", "title"],
            },
        ),
    ]
