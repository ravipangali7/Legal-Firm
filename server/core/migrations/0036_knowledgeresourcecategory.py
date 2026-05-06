# Generated manually for KnowledgeResourceCategory

import uuid

from django.db import migrations, models


def seed_knowledge_base_categories(apps, schema_editor):
    KnowledgeResourceCategory = apps.get_model("core", "KnowledgeResourceCategory")
    names = ["Legal Acts", "Court Forms", "Templates", "Guidelines"]
    for i, name in enumerate(names):
        KnowledgeResourceCategory.objects.get_or_create(name=name, defaults={"sort_order": i})


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0035_notice_slug_bilingual_vote"),
    ]

    operations = [
        migrations.CreateModel(
            name="KnowledgeResourceCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=64, unique=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Knowledge base category",
                "verbose_name_plural": "Knowledge base categories",
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.RunPython(seed_knowledge_base_categories, migrations.RunPython.noop),
    ]
