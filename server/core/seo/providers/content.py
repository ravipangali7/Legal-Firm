"""Published entity detail URLs."""

from core.models import (
    Act,
    BlogPost,
    LegalCase,
    NewsItem,
    Notice,
    PracticeArea,
    Procedure,
    ServiceItem,
    Summary,
    TeamMember,
)
from core.seo.base import site_base_url
from core.seo.sitemap import add_url


def entries():
    base = site_base_url()
    out: list[dict] = []

    for row in Act.objects.only("slug", "updated"):
        add_url(out, base, f"/laws/{row.slug}", lastmod=row.updated, priority="0.6", changefreq="monthly")

    for row in Summary.objects.only("slug", "posted"):
        add_url(out, base, f"/summaries/{row.slug}", lastmod=row.posted, priority="0.7", changefreq="weekly")

    for row in Procedure.objects.only("slug"):
        add_url(out, base, f"/procedures/{row.slug}", priority="0.6", changefreq="monthly")

    for row in Notice.objects.filter(published=True).only("slug", "updated_at"):
        add_url(out, base, f"/notices/{row.slug}", lastmod=row.updated_at, priority="0.7", changefreq="daily")

    for row in PracticeArea.objects.only("slug"):
        add_url(out, base, f"/practice-areas/{row.slug}", priority="0.7", changefreq="monthly")

    for row in LegalCase.objects.only("slug", "date_filed"):
        add_url(out, base, f"/case/{row.slug}", lastmod=row.date_filed, priority="0.5", changefreq="yearly")

    for row in BlogPost.objects.filter(published=True).only("id", "date"):
        add_url(out, base, f"/blog/{row.id}", lastmod=row.date, priority="0.6", changefreq="weekly")

    for row in TeamMember.objects.filter(enabled=True).only("id"):
        add_url(out, base, f"/professionals/{row.id}", priority="0.5", changefreq="monthly")

    for row in NewsItem.objects.filter(enabled=True).only("id", "date"):
        add_url(out, base, f"/news/{row.id}", lastmod=row.date, priority="0.5", changefreq="weekly")
        add_url(out, base, f"/events/{row.id}", lastmod=row.date, priority="0.4", changefreq="weekly")

    for row in ServiceItem.objects.filter(enabled=True).only("id"):
        add_url(out, base, f"/services/{row.id}", priority="0.5", changefreq="monthly")

    return out
