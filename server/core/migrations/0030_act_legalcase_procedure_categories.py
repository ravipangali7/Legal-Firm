# Generated manually — migrates free-text category strings to FK taxonomy tables.

import uuid

from django.db import migrations, models
import django.db.models.deletion
from django.utils.text import slugify


def _ensure_category_row(CategoryModel, label: str, sort_order: int):
    label = (label or "").strip() or "Uncategorized"
    existing = CategoryModel.objects.filter(name__iexact=label).first()
    if existing:
        return existing
    base = (slugify(label) or "uncategorized")[:100]
    slug = base
    n = 0
    while CategoryModel.objects.filter(slug=slug).exists():
        n += 1
        slug = f"{base}-{n}"[:128]
    return CategoryModel.objects.create(
        id=uuid.uuid4(),
        slug=slug,
        name=label,
        color="#64748b",
        sort_order=sort_order,
    )


def forwards(apps, schema_editor):
    Act = apps.get_model("core", "Act")
    ActCategory = apps.get_model("core", "ActCategory")
    LegalCase = apps.get_model("core", "LegalCase")
    LegalCaseCategory = apps.get_model("core", "LegalCaseCategory")
    Procedure = apps.get_model("core", "Procedure")
    ProcedureCategory = apps.get_model("core", "ProcedureCategory")

    act_order = 0
    for act in Act.objects.all():
        label = getattr(act, "category", "") or ""
        cat = _ensure_category_row(ActCategory, label, act_order)
        act_order += 1
        act.category_ref_id = cat.id
        act.save(update_fields=["category_ref_id"])

    lc_order = 0
    for row in LegalCase.objects.all():
        label = getattr(row, "category", "") or ""
        cat = _ensure_category_row(LegalCaseCategory, label, lc_order)
        lc_order += 1
        row.category_ref_id = cat.id
        row.save(update_fields=["category_ref_id"])

    proc_order = 0
    for proc in Procedure.objects.all():
        label = getattr(proc, "category", "") or ""
        cat = _ensure_category_row(ProcedureCategory, label, proc_order)
        proc_order += 1
        proc.category_ref_id = cat.id
        proc.save(update_fields=["category_ref_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0029_appsettings_subscription_prices_six_month_billing"),
    ]

    operations = [
        migrations.CreateModel(
            name="ActCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("slug", models.SlugField(max_length=128, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("color", models.CharField(default="#64748b", max_length=64)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={
                "ordering": ["sort_order", "name"],
                "verbose_name": "Act category",
                "verbose_name_plural": "Act categories",
            },
        ),
        migrations.CreateModel(
            name="LegalCaseCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("slug", models.SlugField(max_length=128, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("color", models.CharField(default="#64748b", max_length=64)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={
                "ordering": ["sort_order", "name"],
                "verbose_name": "Legal case category",
                "verbose_name_plural": "Legal case categories",
            },
        ),
        migrations.CreateModel(
            name="ProcedureCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("slug", models.SlugField(max_length=128, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("color", models.CharField(default="#64748b", max_length=64)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={
                "ordering": ["sort_order", "name"],
                "verbose_name": "Procedure category",
                "verbose_name_plural": "Procedure categories",
            },
        ),
        migrations.AddField(
            model_name="act",
            name="category_ref",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="core.actcategory",
            ),
        ),
        migrations.AddField(
            model_name="legalcase",
            name="category_ref",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="core.legalcasecategory",
            ),
        ),
        migrations.AddField(
            model_name="procedure",
            name="category_ref",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="+",
                to="core.procedurecategory",
            ),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
        migrations.RemoveField(model_name="act", name="category"),
        migrations.RemoveField(model_name="legalcase", name="category"),
        migrations.RemoveField(model_name="procedure", name="category"),
        migrations.RenameField(model_name="act", old_name="category_ref", new_name="category"),
        migrations.RenameField(model_name="legalcase", old_name="category_ref", new_name="category"),
        migrations.RenameField(model_name="procedure", old_name="category_ref", new_name="category"),
        migrations.AlterField(
            model_name="act",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="acts",
                to="core.actcategory",
            ),
        ),
        migrations.AlterField(
            model_name="legalcase",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="legal_cases",
                to="core.legalcasecategory",
            ),
        ),
        migrations.AlterField(
            model_name="procedure",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="procedures",
                to="core.procedurecategory",
            ),
        ),
    ]
