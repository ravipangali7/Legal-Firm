import shutil
import tempfile
import uuid
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import Client, KnowledgeResource, KnowledgeResourceCategory, Role

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
