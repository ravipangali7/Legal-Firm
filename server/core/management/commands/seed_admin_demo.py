"""
Populate Users, Transaction, Client, Project, PricingPlan, and AppSettings
from the same reference data as ``adminStore.tsx``.

Run after ``seed_roles_permissions``. Idempotent via email/slug keys.

Default password for seeded users: ``changeme`` (development only).
"""

from datetime import date
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from core import models

USERS_SPEC = [
    {
        "email": "ram@taxlexis.np",
        "full_name": "Ram Bahadur",
        "phone": "+977 9801234567",
        "role": "super_admin",
        "status": models.User.Status.ACTIVE,
        "subscribed": True,
        "plan": models.User.Plan.ENTERPRISE,
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "email": "sita@taxlexis.np",
        "full_name": "Sita Sharma",
        "phone": "+977 9812345678",
        "role": "admin",
        "status": models.User.Status.ACTIVE,
        "subscribed": True,
        "plan": models.User.Plan.PREMIUM,
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "email": "hari@gmail.com",
        "full_name": "Hari Thapa",
        "phone": "+977 9823456789",
        "role": "editor",
        "status": models.User.Status.ACTIVE,
        "subscribed": True,
        "plan": models.User.Plan.BASIC,
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "email": "gita@abc.com.np",
        "full_name": "Gita Karki",
        "phone": "+977 9834567890",
        "role": "client",
        "status": models.User.Status.ACTIVE,
        "subscribed": True,
        "plan": models.User.Plan.PREMIUM,
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "email": "bikash@yahoo.com",
        "full_name": "Bikash Lama",
        "phone": "+977 9845678901",
        "role": "user",
        "status": models.User.Status.ACTIVE,
        "subscribed": False,
        "plan": models.User.Plan.FREE,
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "email": "anita@xyz.org",
        "full_name": "Anita Rai",
        "phone": "+977 9856789012",
        "role": "user",
        "status": models.User.Status.PENDING,
        "subscribed": False,
        "plan": models.User.Plan.FREE,
        "is_staff": True,
        "is_superuser": False,
    },
    {
        "email": "dipesh@mail.com",
        "full_name": "Dipesh Shrestha",
        "phone": "+977 9867890123",
        "role": "user",
        "status": models.User.Status.SUSPENDED,
        "subscribed": False,
        "plan": models.User.Plan.FREE,
        "is_staff": True,
        "is_superuser": False,
    },
]


TRANSACTIONS = [
    ("INV-2026-0142", "gita@abc.com.np", "gita@abc.com.np", "4999", "verified", "esewa", "ESW-2X9K1"),
    ("INV-2026-0143", "anita@xyz.org", "anita@xyz.org", "1999", "pending", "khalti", "KHL-7H4M2"),
    ("INV-2026-0144", "bikash@yahoo.com", "bikash@yahoo.com", "999", "rejected", "bank", "NIBL-998812"),
    ("INV-2026-0145", "hari@gmail.com", "hari@gmail.com", "4999", "verified", "esewa", "ESW-9L2P3"),
    ("INV-2026-0146", "sita@taxlexis.np", "sita@taxlexis.np", "19999", "verified", "stripe", "pi_3OqXyZ"),
]

CLIENTS = [
    ("ABC Trading Pvt Ltd", "Gita Karki", "gita@abc.com.np", "+977 9834567890", "business", "301234567", "active", "2025-05-20"),
    ("Himalayan Co-op", "Suman Magar", "info@himcoop.np", "+977 9811223344", "business", "305678912", "active", "2025-09-11"),
    ("Individual", "Bikash Lama", "bikash@yahoo.com", "+977 9845678901", "individual", "102345678", "inactive", "2026-01-10"),
]

PROJECTS = [
    (
        "Annual Tax Filing FY 2082/83",
        "ABC Trading Pvt Ltd",
        "Tax Compliance",
        models.Project.Status.IN_PROGRESS,
        65,
        "2026-07-15",
        ["Ram Bahadur", "Sita Sharma"],
    ),
    (
        "Company Re-registration",
        "Himalayan Co-op",
        "Corporate Law",
        models.Project.Status.REVIEW,
        90,
        "2026-05-20",
        ["Hari Thapa"],
    ),
    (
        "VAT Audit Defense",
        "ABC Trading Pvt Ltd",
        "Litigation",
        models.Project.Status.PLANNING,
        15,
        "2026-08-30",
        ["Sita Sharma"],
    ),
    (
        "Trademark Registration",
        "ABC Trading Pvt Ltd",
        "IP Law",
        models.Project.Status.COMPLETED,
        100,
        "2026-03-10",
        ["Hari Thapa", "Ram Bahadur"],
    ),
]

PLANS = [
    ("Basic", Decimal("499"), Decimal("4790"), ["Access to all Acts & Laws", "20 case summaries / month"], "Get Started", False, True, 0),
    (
        "Premium",
        Decimal("1999"),
        Decimal("19190"),
        ["Everything in Basic", "Unlimited case summaries"],
        "Get Started",
        True,
        True,
        1,
    ),
    (
        "Enterprise",
        Decimal("4999"),
        Decimal("47990"),
        ["Everything in Premium", "Multi-user access"],
        "Contact Sales",
        False,
        True,
        2,
    ),
]

HELP_ARTICLES = [
    {
        "title": "Managing users and roles",
        "category": "Getting started",
        "content": (
            "Use **Users** to invite accounts and **Roles** to restrict modules. "
            "Super Admin can edit the permission matrix per module."
        ),
        "sort_order": 1,
        "published": True,
    },
    {
        "title": "Verifying transactions",
        "category": "Billing",
        "content": (
            "Open **Transactions**, filter by Pending, then mark **Verified** when the gateway confirms funds. "
            "Refunds downgrade the user plan automatically in demo mode."
        ),
        "sort_order": 2,
        "published": True,
    },
    {
        "title": "Homepage CMS sections",
        "category": "CMS",
        "content": (
            "Edit slides, services, and footer under **Homepage CMS**. "
            "Changes apply to the marketing site immediately after save."
        ),
        "sort_order": 3,
        "published": True,
    },
    {
        "title": "Keyboard shortcuts",
        "category": "Tips",
        "content": (
            "Use the header search on wide screens; collapse the sidebar for more horizontal space on smaller laptops."
        ),
        "sort_order": 4,
        "published": False,
    },
]


class Command(BaseCommand):
    help = "Seed admin portal demo data (matches adminStore seed arrays)."

    def handle(self, *args, **options):
        pw = make_password("changeme")

        users_by_email = {}
        for spec in USERS_SPEC:
            email = spec["email"]
            role_obj = models.Role.objects.get(key=spec["role"])
            user, _ = models.User.objects.update_or_create(
                email=email,
                defaults={
                    "full_name": spec["full_name"],
                    "phone": spec["phone"],
                    "role": role_obj,
                    "status": spec["status"],
                    "subscribed": spec["subscribed"],
                    "plan": spec["plan"],
                    "is_staff": spec["is_staff"],
                    "is_superuser": spec["is_superuser"],
                    "is_active": spec["status"] != models.User.Status.SUSPENDED,
                },
            )
            user.password = pw
            user.save(update_fields=["password"])
            users_by_email[email] = user

        for inv, user_email, snap_email, amt, st, method, code in TRANSACTIONS:
            u = users_by_email[user_email]
            models.Transaction.objects.update_or_create(
                invoice=inv,
                defaults={
                    "user": u,
                    "email": snap_email,
                    "amount": Decimal(amt),
                    "currency": models.Transaction.Currency.NPR,
                    "method": method,
                    "status": st,
                    "txn_code": code,
                },
            )

        clients_by_company = {}
        for company, contact, email, phone, typ, pan, status, joined in CLIENTS:
            c, _ = models.Client.objects.update_or_create(
                company=company,
                defaults={
                    "contact": contact,
                    "email": email,
                    "phone": phone,
                    "type": typ,
                    "pan_vat": pan,
                    "status": status,
                    "joined_at": date.fromisoformat(joined),
                },
            )
            clients_by_company[company] = c

        for name, company, ptype, status, progress, due, team_names in PROJECTS:
            client = clients_by_company[company]
            proj, _ = models.Project.objects.update_or_create(
                name=name,
                client=client,
                defaults={
                    "type": ptype,
                    "status": status,
                    "progress": progress,
                    "due_date": date.fromisoformat(due),
                },
            )
            proj.team.clear()
            for nm in team_names:
                u = users_by_name.get(nm)
                if u:
                    proj.team.add(u)

        for name, monthly, yearly, feats, cta, highlight, enabled, sort_order in PLANS:
            models.PricingPlan.objects.update_or_create(
                name=name,
                defaults={
                    "monthly": monthly,
                    "yearly": yearly,
                    "features": feats,
                    "cta": cta,
                    "highlight": highlight,
                    "enabled": enabled,
                    "sort_order": sort_order,
                },
            )

        for row in HELP_ARTICLES:
            models.HelpArticle.objects.update_or_create(
                title=row["title"],
                defaults={
                    "category": row["category"],
                    "content": row["content"],
                    "sort_order": row["sort_order"],
                    "published": row["published"],
                },
            )

        models.PricingPageConfig.load()

        s = models.AppSettings.load()
        s.site_name = "TaxLexis Legal"
        s.support_email = "support@taxlexis.np"
        s.support_phone = "+977 1 4444555"
        s.currency = "NPR"
        s.tax_rate = Decimal("13")
        s.maintenance_mode = False
        s.allow_signups = True
        s.email_notifications = True
        s.payments_enabled = True
        s.esewa_enabled = True
        s.khalti_enabled = False
        s.nav_order = [
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
        s.save()

        self.stdout.write(self.style.SUCCESS("Admin demo data seeded (password for users: changeme)."))
