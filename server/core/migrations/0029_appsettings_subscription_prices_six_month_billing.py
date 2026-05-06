from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0028_remove_content_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsettings",
            name="individual_monthly_price",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("999"),
                help_text="Base monthly subscription price for individual accounts (used for 1 / 6 / 12 month checkout).",
                max_digits=12,
            ),
        ),
        migrations.AddField(
            model_name="appsettings",
            name="business_monthly_price",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("1999"),
                help_text="Base monthly subscription price for business accounts (used for 1 / 6 / 12 month checkout).",
                max_digits=12,
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="billing_cycle",
            field=models.CharField(
                choices=[
                    ("monthly", "Monthly"),
                    ("six_month", "6 months"),
                    ("yearly", "Yearly"),
                ],
                default="monthly",
                help_text="Billing period for the purchased package (drives subscription length when verified).",
                max_length=16,
            ),
        ),
    ]
