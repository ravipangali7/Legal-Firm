# Generated manually

from django.db import migrations, models


def seed_income_tax_detail(apps, schema_editor):
    from core.act_detail_seed import INCOME_TAX_ACT_2058_DETAIL

    Act = apps.get_model("core", "Act")
    Act.objects.filter(slug="income-tax-act-2058").update(detail_json=INCOME_TAX_ACT_2058_DETAIL)


def unseed_income_tax_detail(apps, schema_editor):
    Act = apps.get_model("core", "Act")
    Act.objects.filter(slug="income-tax-act-2058").update(detail_json=None)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0024_admin_broadcast_notification_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="act",
            name="detail_json",
            field=models.JSONField(blank=True, default=None, null=True),
        ),
        migrations.RunPython(seed_income_tax_detail, unseed_income_tax_detail),
    ]
