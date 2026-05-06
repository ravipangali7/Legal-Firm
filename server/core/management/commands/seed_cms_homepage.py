"""
Seed singleton CMS rows and collection rows for a full TaxLexis Legal–style homepage
(navigation, hero, about, services, team, news, testimonials, footer).
"""

from django.core.management.base import BaseCommand

from core import models
from core.image_uploads import download_url_to_imagefield

SUMMARY_CHILDREN = [
    ("List of Summaries", "/summaries"),
    ("Advance Tax Rates", "/summaries/advance-tax-rates"),
    ("Income Tax Rates (FY 2078–79)", "/summaries/income-tax-rates-2078-79"),
    ("Income Tax Rates (FY 2077–78)", "/summaries/income-tax-rates-2077-78"),
    ("0% मू.अ.कर (0% VAT)", "/summaries/zero-vat"),
]


class Command(BaseCommand):
    help = "Seed homepage/CMS rows for development."

    def handle(self, *args, **options):
        hc = models.SiteHomepageConfig.load()
        hc.section_hero = True
        hc.section_about = True
        hc.section_services = True
        hc.section_team = True
        hc.section_news = True
        hc.section_testimonials = True
        hc.section_footer = True
        hc.section_procedures = True
        hc.section_styles = {}
        hc.save()

        settings = models.AppSettings.load()
        settings.site_name = "TaxLexis Legal"
        settings.nav_order = [
            "Home",
            "Law",
            "Summary",
            "Procedure",
            "Tax",
            "Knowledge Base",
            "Pricing",
            "About",
            "Professional",
            "Contact",
        ]
        settings.save()

        about = models.AboutSection.load()
        about.enabled = True
        about.eyebrow = "Who we are"
        about.title = "TaxLexis Legal"
        about.body = (
            "We combine deep expertise in tax law and compliance with practical guidance "
            "so your business stays audit-ready and strategically positioned. Acts, cases, "
            "and procedures—organized for clarity and speed."
        )
        about.save()
        download_url_to_imagefield(
            about,
            "image",
            "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&q=80",
        )
        about.save()
        about.stats.all().delete()
        models.AboutStat.objects.create(section=about, label="Years", value="15+", order=0)
        models.AboutStat.objects.create(section=about, label="Clients", value="500+", order=1)

        footer = models.FooterConfig.load()
        footer.tagline = (
            "Professional legal and tax advisory—trusted by businesses for clarity, compliance, and results."
        )
        footer.copyright = f"© {__import__('datetime').datetime.now().year} TaxLexis Legal. All rights reserved."
        footer.save()

        models.FooterColumn.objects.filter(config=footer).delete()
        col_about, _ = models.FooterColumn.objects.get_or_create(
            config=footer, title="Explore", defaults={"order": 0}
        )
        for i, (lab, href) in enumerate(
            [
                ("Laws", "/laws"),
                ("Summaries", "/summaries"),
                ("Procedures", "/procedures"),
            ]
        ):
            models.FooterLink.objects.create(column=col_about, label=lab, href=href, order=i)

        col_contact, _ = models.FooterColumn.objects.get_or_create(
            config=footer, title="Contact", defaults={"order": 1}
        )
        for i, (lab, href) in enumerate(
            [
                ("Contact us", "/contact"),
                ("Pricing", "/pricing"),
                ("Professionals", "/professionals"),
            ]
        ):
            models.FooterLink.objects.create(column=col_contact, label=lab, href=href, order=i)

        models.FooterSocialLink.objects.filter(config=footer).delete()
        for i, (lab, href) in enumerate(
            [
                ("LinkedIn", "https://linkedin.com"),
                ("Facebook", "https://facebook.com"),
                ("X", "https://x.com"),
            ]
        ):
            models.FooterSocialLink.objects.create(config=footer, label=lab, href=href, order=i)

        models.SiteNavItem.objects.all().delete()
        nav_defs = [
            ("Home", "/", False, []),
            ("Law", "/laws", False, []),
            ("Summary", "#", True, SUMMARY_CHILDREN),
            ("Procedure", "/procedures", False, []),
            ("Tax", "/practice-areas/taxation-law", False, []),
            ("Knowledge Base", "/knowledge-base", False, []),
            ("Pricing", "/pricing", False, []),
            ("About", "/about", False, []),
            ("Professional", "/professionals", False, []),
            ("Contact", "/contact", False, []),
        ]
        for i, (label, href, is_dd, children) in enumerate(nav_defs):
            nav = models.SiteNavItem.objects.create(
                order=i,
                enabled=True,
                label=label,
                href=href,
                is_dropdown=is_dd,
            )
            for j, (cl, chref) in enumerate(children):
                models.SiteNavChild.objects.create(
                    parent=nav, label=cl, href=chref, order=j
                )

        models.HeroSlide.objects.all().delete()
        slide = models.HeroSlide.objects.create(
            order=0,
            enabled=True,
            eyebrow="Tax consultant",
            title="Expert Tax Counsel",
            subtitle="Acts, cases and procedures in one place.",
            cta="Get started",
            href="/contact",
            secondary_cta="Talk to a lawyer",
            secondary_href="/contact",
        )
        download_url_to_imagefield(
            slide,
            "image",
            "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80",
        )
        slide.save()

        models.ServiceItem.objects.all().delete()
        svc_rows = [
            ("Scale", "Compliance", "Filings, audits, and ongoing regulatory alignment.", "/procedures"),
            ("Gavel", "Tax advisory", "Planning, disputes, and audit support.", "/practice-areas/taxation-law"),
            ("Building2", "Corporate", "Governance, contracts, and entity structuring.", "/practice-areas/company-law"),
            ("BookOpen", "Knowledge library", "Acts, rules, and curated updates.", "/laws"),
        ]
        for i, (icon, title, desc, href) in enumerate(svc_rows):
            models.ServiceItem.objects.create(
                order=i,
                enabled=True,
                icon=icon,
                title=title,
                description=desc,
                href=href,
            )

        models.TeamMember.objects.all().delete()
        team_seed = [
            (
                0,
                "James Parker",
                "Partner · Tax & Corporate",
                "Strategic counsel for growing businesses and complex tax matters.",
                35,
                "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80",
            ),
            (
                1,
                "Sarah Mitchell",
                "Partner · Litigation",
                "Disputes, compliance, and clear guidance through complex filings.",
                32,
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
            ),
            (
                2,
                "David Chen",
                "Chartered Accountant",
                "Audit-ready books, tax planning, and cross-border structuring.",
                28,
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80",
            ),
            (
                3,
                "Elena Vasquez",
                "Senior Associate · Corporate",
                "Entity governance, contracts, and day-to-day commercial support.",
                25,
                "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80",
            ),
        ]
        for order, name, role, bio, years, img_url in team_seed:
            member = models.TeamMember.objects.create(
                order=order,
                enabled=True,
                name=name,
                role=role,
                bio=bio,
                years_experience=years,
                linkedin_url="https://www.linkedin.com/in/example",
                contact_email="",
            )
            download_url_to_imagefield(member, "avatar", img_url)
            member.save()

        ppc = models.ProfessionalsPageConfig.load()
        ppc.hero_title = "Our Professionals"
        ppc.hero_subtitle = (
            "Experienced advocates and chartered accountants dedicated to delivering excellence "
            "in Nepalese law and taxation."
        )
        ppc.stat_professionals_label = ""
        ppc.stat_experience_label = ""
        ppc.stat_practice_label = ""
        ppc.save()

        models.NewsItem.objects.all().delete()
        news = models.NewsItem.objects.create(
            order=0,
            enabled=True,
            title="Budget made polished",
            excerpt="Key takeaways from the latest fiscal measures—and what they mean for your filings.",
            date="2026-04-15",
            href="/blog",
            tag="Insights",
        )
        download_url_to_imagefield(
            news,
            "image",
            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80",
        )
        news.save()

        tc = models.TestimonialsConfig.load()
        tc.title = "What Our Clients Say"
        tc.intro = (
            "Trusted by businesses across Texas for our professional legal and tax advisory services."
        )
        tc.metrics = [
            {"value": "4.8/5", "label": "Rating"},
            {"value": "500+", "label": "Client Reviews"},
            {"value": "100%", "label": "Client Satisfaction"},
        ]
        tc.save()

        models.Testimonial.objects.all().delete()
        quotes = [
            (
                "Sarah Mitchell",
                "CFO, Meridian Logistics",
                "TaxLexis Legal made our multi-state compliance straightforward. Responsive, precise, and genuinely invested in outcomes.",
            ),
            (
                "David Chen",
                "Founder, BrightStack SaaS",
                "From entity setup to ongoing tax strategy, the team has been a steady partner as we scaled.",
            ),
            (
                "Elena Vasquez",
                "Director, Rio Manufacturing",
                "Clear communication and meticulous documentation—exactly what we needed before our audit season.",
            ),
            (
                "Marcus Webb",
                "Owner, Webb Retail Group",
                "Practical advice without the jargon. We trust them with our books and our growth plans.",
            ),
        ]
        faces = [
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&q=80",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
        ]
        for i, ((name, role, content), img) in enumerate(zip(quotes, faces)):
            t = models.Testimonial.objects.create(
                order=i,
                enabled=True,
                name=name,
                role_title=role,
                content=content,
                rating=5,
            )
            download_url_to_imagefield(t, "image", img)
            t.save()

        self.stdout.write(self.style.SUCCESS("CMS homepage seed complete."))
