from django.db import migrations, models


EVENT_TO_AUTOMATE = {
    "signup": "sign_up",
    "login": "login",
    "otp_login": "otp",
    "password_reset": "otp",
    "payment_verified": "paid",
    "payment_pending": "paid",
    "payment_rejected": "paid",
    "subscription_due": "payment_due",
    "package_ended": "payment_due",
}

# When deduplicating, keep the row with this event_type per automate bucket.
KEEP_EVENT_BY_AUTOMATE = {
    "sign_up": "signup",
    "login": "login",
    "otp": "otp_login",
    "payment_due": "subscription_due",
    "paid": "payment_verified",
}


def populate_automate_and_dedupe(apps, schema_editor):
    EmailTemplate = apps.get_model("core", "EmailTemplate")
    by_automate: dict[str, list] = {}
    for tpl in EmailTemplate.objects.all().order_by("pk"):
        auto = EVENT_TO_AUTOMATE.get(tpl.event_type, "login")
        tpl.automate = auto
        tpl.save(update_fields=["automate"])
        by_automate.setdefault(auto, []).append(tpl)

    for auto, rows in by_automate.items():
        if len(rows) <= 1:
            continue
        keep_evt = KEEP_EVENT_BY_AUTOMATE.get(auto)
        keep = next((r for r in rows if r.event_type == keep_evt), rows[0])
        for r in rows:
            if r.pk != keep.pk:
                r.delete()

    # Ensure subscribed row exists (new automation).
    if not EmailTemplate.objects.filter(automate="subscribed").exists():
        EmailTemplate.objects.create(
            automate="subscribed",
            event_type="",
            name="Subscribed",
            subject="{{site_name}}: Your subscription is active",
            body=(
                "Hello {{user_name}},\n\n"
                "Your {{plan}} subscription at {{site_name}} is now active. "
                "Library access runs until {{package_end_date}}.\n\n"
                "Manage your account: {{wallet_url}}"
            ),
            description="Sent when subscription access is granted after payment verification.",
            enabled=True,
        )


def reseed_automate_from_defaults(apps, schema_editor):
    from core.email_templates import seed_default_email_templates

    seed_default_email_templates()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0039_email_templates_otp_purpose"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailtemplate",
            name="automate",
            field=models.CharField(
                choices=[
                    ("login", "Login"),
                    ("sign_up", "Sign up"),
                    ("otp", "OTP"),
                    ("payment_due", "Payment due"),
                    ("paid", "Paid"),
                    ("subscribed", "Subscribed"),
                ],
                help_text="System event that sends this template automatically.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="emailtemplate",
            name="event_type",
            field=models.CharField(
                blank=True,
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
                help_text="Primary legacy trigger key (optional).",
                max_length=32,
            ),
        ),
        migrations.RunPython(populate_automate_and_dedupe, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="emailtemplate",
            name="automate",
            field=models.CharField(
                choices=[
                    ("login", "Login"),
                    ("sign_up", "Sign up"),
                    ("otp", "OTP"),
                    ("payment_due", "Payment due"),
                    ("paid", "Paid"),
                    ("subscribed", "Subscribed"),
                ],
                help_text="System event that sends this template automatically.",
                max_length=32,
                unique=True,
            ),
        ),
        migrations.AlterModelOptions(
            name="emailtemplate",
            options={
                "ordering": ["automate"],
                "verbose_name": "Email template",
                "verbose_name_plural": "Email templates",
            },
        ),
        migrations.RunPython(reseed_automate_from_defaults, migrations.RunPython.noop),
    ]
