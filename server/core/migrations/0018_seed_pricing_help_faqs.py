# Generated manually — bootstrap HelpArticle rows for public /pricing FAQs when absent.

from django.db import migrations


PRICING_FAQS = [
    {
        "title": "Can I switch plans later?",
        "content": (
            "Yes — upgrade or downgrade any time from your dashboard. "
            "Pro-rated charges apply when you move between paid tiers."
        ),
        "sort_order": 10,
    },
    {
        "title": "Which payment methods do you accept?",
        "content": (
            "We support **eSewa**, **Khalti**, and **bank transfer** (including QR where available). "
            "Card payments via Stripe may be enabled by your site administrator."
        ),
        "sort_order": 11,
    },
    {
        "title": "Is there a free trial?",
        "content": (
            "Public preview content is always free. Subscribers get full content, downloads, and tools according to their plan."
        ),
        "sort_order": 12,
    },
    {
        "title": "Do you offer refunds?",
        "content": (
            "We offer a **7-day money-back guarantee** on first-time subscriptions, subject to the terms shown at checkout."
        ),
        "sort_order": 13,
    },
]


def seed_faqs(apps, schema_editor):
    HelpArticle = apps.get_model("core", "HelpArticle")
    if HelpArticle.objects.filter(category="Pricing", published=True).exists():
        return
    for row in PRICING_FAQS:
        HelpArticle.objects.create(
            title=row["title"],
            category="Pricing",
            content=row["content"],
            sort_order=row["sort_order"],
            published=True,
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0017_pricing_page_config"),
    ]

    operations = [
        migrations.RunPython(seed_faqs, noop_reverse),
    ]
