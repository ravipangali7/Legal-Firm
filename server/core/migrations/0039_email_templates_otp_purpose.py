import uuid

from django.db import migrations, models


def seed_email_templates(apps, schema_editor):
    from core.email_templates import seed_default_email_templates

    seed_default_email_templates()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0038_user_default_is_staff_true"),
    ]

    operations = [
        migrations.AddField(
            model_name="otpverification",
            name="email",
            field=models.EmailField(blank=True, db_index=True, default=""),
        ),
        migrations.AddField(
            model_name="otpverification",
            name="purpose",
            field=models.CharField(
                choices=[
                    ("phone_login", "Phone login"),
                    ("password_reset", "Password reset"),
                ],
                db_index=True,
                default="phone_login",
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="otpverification",
            name="phone_digits",
            field=models.CharField(blank=True, db_index=True, max_length=16),
        ),
        migrations.CreateModel(
            name="EmailTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("signup", "Signup welcome"),
                            ("login", "Login thank you"),
                            ("otp_login", "OTP login code"),
                            ("password_reset", "Password reset OTP"),
                            ("payment_verified", "Payment confirmed"),
                            ("payment_pending", "Payment pending verification"),
                            ("payment_rejected", "Payment rejected"),
                            ("subscription_due", "Subscription renewal due"),
                            ("package_ended", "Package ended"),
                        ],
                        max_length=32,
                        unique=True,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("subject", models.CharField(max_length=255)),
                ("body", models.TextField()),
                ("enabled", models.BooleanField(default=True)),
                ("description", models.TextField(blank=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Email template",
                "verbose_name_plural": "Email templates",
                "ordering": ["event_type"],
            },
        ),
        migrations.RunPython(seed_email_templates, migrations.RunPython.noop),
    ]
