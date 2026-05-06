from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0015_transaction_billing_cycle_rejection_reason"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="subscription_period_start",
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text="When the current package was requested (pending transaction created_at); fixed at verification.",
            ),
        ),
    ]
