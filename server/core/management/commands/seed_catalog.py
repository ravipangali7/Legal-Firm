"""
Minimal catalog seed: SummaryCategory + Summary, Act, Procedure (+ optional steps), LegalCase.
"""

from datetime import date

from django.core.management.base import BaseCommand

from core import models
from core.act_detail_seed import INCOME_TAX_ACT_2058_DETAIL
from core.image_uploads import download_url_to_imagefield


class Command(BaseCommand):
    help = "Seed knowledge-base catalog samples."

    def handle(self, *args, **options):
        cat, _ = models.SummaryCategory.objects.get_or_create(
            slug="tax",
            defaults={"name": "Tax", "color": "#0d6efd", "sort_order": 0},
        )

        models.Summary.objects.get_or_create(
            slug="vat-refunds-overview",
            defaults={
                "title": "VAT refunds — overview",
                "category": cat,
                "posted": date(2026, 4, 1),
                "views": 120,
                "upvotes": 10,
                "downvotes": 1,
                "preview": "Key refund timelines and documentation.",
                "premium": False,
                "body": (
                    '<h2 id="overview">Overview</h2>'
                    "<p>This summary outlines when and how registered persons may claim VAT refunds, "
                    "typical documentation, and compliance touchpoints with IRD.</p>"
                    '<h2 id="eligibility">Eligibility</h2>'
                    "<p>Refunds generally arise on excess input tax (e.g. exports, zero-rated supplies, "
                    "or inverted duty structures) where output tax is lower than creditable purchases.</p>"
                    '<h2 id="documentation">Documentation</h2>'
                    "<p>Keep tax invoices, customs declarations for exports, and bank evidence of "
                    "realization where applicable. IRD may request these during desk review or audit.</p>"
                    '<h2 id="notes">Notes</h2>'
                    "<p>Timelines and thresholds follow published circulars; verify current IRD guidance "
                    "before filing.</p>"
                ),
            },
        )

        act_cat, _ = models.ActCategory.objects.get_or_create(
            slug="tax",
            defaults={"name": "Tax", "color": "#0d6efd", "sort_order": 0},
        )

        models.Act.objects.get_or_create(
            slug="income-tax-act-2058",
            defaults={
                "title_en": "Income Tax Act, 2058",
                "title_ne": "आयकर ऐन, २०५८",
                "category": act_cat,
                "year": "2058",
                "updated": date(2026, 1, 1),
                "premium": False,
                "detail_json": INCOME_TAX_ACT_2058_DETAIL,
            },
        )

        proc_cat, _ = models.ProcedureCategory.objects.get_or_create(
            slug="company",
            defaults={"name": "Company", "color": "#64748b", "sort_order": 0},
        )

        proc, _ = models.Procedure.objects.get_or_create(
            slug="company-registration",
            defaults={
                "category": proc_cat,
                "title": "Company registration",
                "summary": "High-level steps for incorporation.",
                "steps_count": 3,
                "duration_label": "2–4 weeks",
                "icon": "Building2",
            },
        )
        if proc.steps.count() == 0:
            models.ProcedureStep.objects.bulk_create(
                [
                    models.ProcedureStep(procedure=proc, order=0, description="Reserve name at OCR."),
                    models.ProcedureStep(procedure=proc, order=1, description="Prepare MOA/AOA and filings."),
                    models.ProcedureStep(procedure=proc, order=2, description="Obtain registration certificate."),
                ]
            )

        case_cat, _ = models.LegalCaseCategory.objects.get_or_create(
            slug="tax",
            defaults={"name": "Tax", "color": "#0d6efd", "sort_order": 0},
        )

        models.LegalCase.objects.get_or_create(
            slug="sample-case-ird-2024",
            defaults={
                "title": "Sample reported decision",
                "reference_number": "IRD-APP-2024-001",
                "date_filed": date(2024, 6, 1),
                "date_decided": date(2025, 2, 10),
                "court": "High Court",
                "category": case_cat,
                "practice_area": "taxation-law",
                "teaser": "Illustrative case record for the catalog.",
                "parties": "Taxpayer vs IRD",
                "summary": "Summary of dispute.",
                "outcome": "Allowed in part.",
                "full_content": {"background": "", "judgment": ""},
            },
        )

        tm, _ = models.TeamMember.objects.get_or_create(
            name="Senior Partner",
            defaults={
                "order": 0,
                "enabled": True,
                "role": "Partner",
                "bio": "Tax litigation.",
            },
        )
        if not tm.avatar:
            download_url_to_imagefield(
                tm,
                "avatar",
                "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80",
            )
            tm.save()

        ni, _ = models.NewsItem.objects.get_or_create(
            title="Budget circular published",
            defaults={
                "order": 0,
                "enabled": True,
                "excerpt": "Updates to withholding rates.",
                "date": date(2026, 4, 15),
                "href": "/blog",
                "tag": "News",
            },
        )
        if not ni.image:
            download_url_to_imagefield(
                ni,
                "image",
                "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
            )
            ni.save()

        models.BlogPost.objects.get_or_create(
            title="Welcome to the TaxLexis blog",
            defaults={
                "excerpt": "Short introduction post.",
                "author_name": "Editorial",
                "category": "General",
                "date": date(2026, 5, 1),
                "published": True,
                "featured": True,
                "body": "<p>Hello world.</p>",
            },
        )

        self.stdout.write(self.style.SUCCESS("Catalog seed complete."))
