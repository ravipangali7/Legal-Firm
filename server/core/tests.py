import shutil
import tempfile
import uuid
from datetime import date, timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Act, ActCategory, Client, KnowledgeResource, KnowledgeResourceCategory, OtpVerification, Role, Summary, SummaryCategory
from core.phone_auth import normalize_phone_digits, phone_login_email

User = get_user_model()

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


class KnowledgeResourceAdminPdfPreviewTests(TestCase):
    """Regression: admin preview must mirror public download for legacy `download_href` shapes."""

    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(
            key="super_admin",
            defaults={"name": "Super Admin", "is_system": True},
        )
        self.user = User.objects.create_superuser(
            email="super@test.example",
            password="secret123",
            full_name="Super",
        )
        self.client.force_authenticate(user=self.user)
        cat_name = f"KR Test Cat {uuid.uuid4().hex[:10]}"
        self.cat = KnowledgeResourceCategory.objects.create(name=cat_name, sort_order=0)

    def test_preview_redirects_for_https_legacy_href(self):
        kr = KnowledgeResource.objects.create(
            title="Legacy URL resource",
            description="",
            category=self.cat.name,
            download_href="https://example.com/static/legacy.pdf",
        )
        url = f"/api/admin/knowledge-resources/{kr.id}/preview-pdf/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "https://example.com/static/legacy.pdf")

    def test_preview_serves_file_for_absolute_url_with_media_path(self):
        """`download_href` may store full site URL while file lives under MEDIA_ROOT."""
        tmp = tempfile.mkdtemp()
        try:
            media_root = Path(tmp)
            rel_piece = "knowledge_resources/abs_test/doc.pdf"
            target = media_root / rel_piece
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(MINIMAL_PDF)

            kr = KnowledgeResource.objects.create(
                title="Abs path resource",
                description="",
                category=self.cat.name,
                download_href=f"https://legalfirm.example.com/media/{rel_piece}",
            )
            with override_settings(MEDIA_ROOT=str(media_root)):
                url = f"/api/admin/knowledge-resources/{kr.id}/preview-pdf/"
                response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertIn("application/pdf", response["Content-Type"])
            # Drain streaming body so file handles close (Windows temp cleanup).
            if hasattr(response, "streaming_content"):
                b"".join(response.streaming_content)
            else:
                _ = response.content
            response.close()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class AdminClientSyncOnRolePatchTests(TestCase):
    """Client-role admin changes must persist a CRM Client and surface on GET /api/admin/clients/."""

    def setUp(self):
        api = APIClient()
        self.client = api
        for row in (
            ("super_admin", "Super Admin"),
            ("admin", "Admin"),
            ("client", "Client"),
            ("user", "User"),
        ):
            Role.objects.get_or_create(key=row[0], defaults={"name": row[1], "is_system": True})
        self.actor = User.objects.create_superuser(
            email=f"crm-sync-actor-{uuid.uuid4().hex[:8]}@test.example",
            password="secret123",
            full_name="Actor",
        )
        self.client.force_authenticate(user=self.actor)

    def test_patch_user_role_to_client_creates_and_lists_crm_client(self):
        u = User.objects.create_user(
            email=f"tgt-{uuid.uuid4().hex[:8]}@test.example",
            password="pwd123456",
            full_name="Target User",
            role="user",
        )
        self.assertFalse(Client.objects.filter(email__iexact=u.email).exists())
        rsp = self.client.patch(f"/api/admin/users/{u.pk}/", {"role": "client"}, format="json")
        self.assertEqual(rsp.status_code, 200)
        self.assertEqual(rsp.data.get("role"), "client")  # type: ignore[attr-defined]
        self.assertTrue(Client.objects.filter(email__iexact=u.email).exists())

        lst = self.client.get("/api/admin/clients/")
        self.assertEqual(lst.status_code, 200)
        payload = lst.data if hasattr(lst, "data") else lst.json()
        emails = [row.get("email") for row in payload]
        self.assertIn(u.email, emails)

    def test_patch_client_user_email_migrates_single_crm_row(self):
        u = User.objects.create_user(
            email=f"migrate-{uuid.uuid4().hex[:8]}@old.example",
            password="pwd123456",
            full_name="Migrant",
            role="client",
        )
        self.assertTrue(Client.objects.filter(email__iexact=u.email).exists())
        crm_before = Client.objects.get(email__iexact=u.email)
        new_email = f"migrate-{uuid.uuid4().hex[:8]}@new.example"
        rsp = self.client.patch(f"/api/admin/users/{u.pk}/", {"email": new_email}, format="json")
        self.assertEqual(rsp.status_code, 200)
        self.assertFalse(Client.objects.filter(email__iexact=u.email).exists())
        self.assertTrue(Client.objects.filter(email__iexact=new_email).exists())
        crm_after = Client.objects.get(email__iexact=new_email)
        self.assertEqual(crm_before.pk, crm_after.pk)


class PremiumContentApiGateTests(TestCase):
    """Premium acts/summaries: plaintext for subscribers only; encrypted blobs for anonymous users."""

    def setUp(self):
        self.api = APIClient()
        Role.objects.get_or_create(key="user", defaults={"name": "User", "is_system": True})
        self.act_cat = ActCategory.objects.create(slug=f"tax-{uuid.uuid4().hex[:8]}", name="Tax")
        self.sum_cat = SummaryCategory.objects.create(
            slug=f"tax-{uuid.uuid4().hex[:8]}",
            name="Tax",
            color="#000",
        )
        self.premium_act = Act.objects.create(
            slug=f"act-prem-{uuid.uuid4().hex[:8]}",
            title_en="Premium Act",
            title_ne="प्रिमियम",
            category=self.act_cat,
            year="2080",
            updated=date(2026, 1, 1),
            premium=True,
            detail_json={"sections": [{"id": "s1", "title": "Secret"}]},
        )
        Act.objects.create(
            slug=f"act-free-{uuid.uuid4().hex[:8]}",
            title_en="Free Act",
            title_ne="निःशुल्क",
            category=self.act_cat,
            year="2080",
            updated=date(2026, 1, 1),
            premium=False,
            detail_json={"sections": [{"id": "s1", "title": "Public"}]},
        )
        self.premium_summary = Summary.objects.create(
            slug=f"sum-prem-{uuid.uuid4().hex[:8]}",
            title="Premium Summary",
            category=self.sum_cat,
            posted=date(2026, 1, 1),
            premium=True,
            body="<p>Secret body</p>",
        )
        self.subscriber = User.objects.create_user(
            email=f"sub-{uuid.uuid4().hex[:8]}@test.example",
            password="pwd123456",
            full_name="Subscriber",
            role="user",
            subscribed=True,
        )
        self.subscriber.subscription_period_end = timezone.now() + timedelta(days=30)
        self.subscriber.save(update_fields=["subscription_period_end"])

    def test_anonymous_premium_act_returns_encrypted_not_plaintext(self):
        rsp = self.api.get(f"/api/acts/{self.premium_act.slug}/")
        self.assertEqual(rsp.status_code, 200)
        self.assertTrue(rsp.data.get("premium"))
        self.assertNotIn("detail_json", rsp.data)
        self.assertIn("detail_json_encrypted", rsp.data)

    def test_subscriber_premium_act_returns_plaintext(self):
        self.api.force_authenticate(user=self.subscriber)
        rsp = self.api.get(f"/api/acts/{self.premium_act.slug}/")
        self.assertEqual(rsp.status_code, 200)
        self.assertIn("detail_json", rsp.data)
        self.assertNotIn("detail_json_encrypted", rsp.data)

    def test_free_act_always_returns_plaintext(self):
        free = Act.objects.filter(premium=False).first()
        rsp = self.api.get(f"/api/acts/{free.slug}/")
        self.assertEqual(rsp.status_code, 200)
        self.assertIn("detail_json", rsp.data)
        self.assertNotIn("detail_json_encrypted", rsp.data)

    def test_anonymous_premium_summary_body_encrypted(self):
        rsp = self.api.get(f"/api/summaries/{self.premium_summary.slug}/")
        self.assertEqual(rsp.status_code, 200)
        self.assertNotIn("body", rsp.data)
        self.assertIn("body_encrypted", rsp.data)


class AuthOtpRequestTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        Role.objects.get_or_create(key="user", defaults={"name": "User", "is_system": True})
        self.digits = "9847670381"
        self.user = User.objects.create_user(
            email=phone_login_email(self.digits),
            password="unused-for-otp",
            full_name="OTP Test",
            phone=f"+977{self.digits}",
            role="user",
        )

    def test_otp_request_unknown_phone_returns_404(self):
        rsp = self.api.post(
            "/api/auth/otp/request/",
            {"phone": "+9779800000001"},
            format="json",
        )
        self.assertEqual(rsp.status_code, 404)

    @override_settings(DEBUG=True)
    def test_otp_request_known_phone_returns_debug_code(self):
        rsp = self.api.post(
            "/api/auth/otp/request/",
            {"phone": f"+977{self.digits}"},
            format="json",
        )
        self.assertEqual(rsp.status_code, 200, rsp.data)
        self.assertEqual(rsp.data.get("detail"), "Verification code sent.")
        self.assertRegex(rsp.data.get("debug_otp", ""), r"^\d{6}$")
        self.assertEqual(
            OtpVerification.objects.filter(
                purpose=OtpVerification.Purpose.PHONE_LOGIN,
                phone_digits=normalize_phone_digits(self.digits),
            ).count(),
            1,
        )
