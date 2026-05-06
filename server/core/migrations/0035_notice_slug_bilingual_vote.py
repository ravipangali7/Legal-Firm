# Generated manually for slug URLs, Nepali fields, and notice votes.

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_notice_slugs(apps, schema_editor):
    from django.utils.text import slugify

    Notice = apps.get_model("core", "Notice")
    for n in Notice.objects.all().iterator():
        base = (slugify(n.title or "")[:180] or "notice").strip("-") or "notice"
        slug = f"{base}-{n.pk}"[:255]
        n.slug = slug
        n.save(update_fields=["slug"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0034_knowledgeresource_pdf_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="notice",
            name="slug",
            field=models.SlugField(db_index=True, max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="notice",
            name="title_ne",
            field=models.CharField(blank=True, max_length=512, verbose_name="title (Nepali)"),
        ),
        migrations.AddField(
            model_name="notice",
            name="excerpt_ne",
            field=models.TextField(blank=True, verbose_name="excerpt (Nepali)"),
        ),
        migrations.AddField(
            model_name="notice",
            name="body_ne",
            field=models.TextField(blank=True, verbose_name="body (Nepali)"),
        ),
        migrations.AddField(
            model_name="notice",
            name="issued_by_ne",
            field=models.CharField(blank=True, max_length=255, verbose_name="issued by (Nepali)"),
        ),
        migrations.RunPython(backfill_notice_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="notice",
            name="slug",
            field=models.SlugField(db_index=True, max_length=255, unique=True),
        ),
        migrations.CreateModel(
            name="NoticeAudienceVote",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("visitor_key", models.CharField(blank=True, max_length=64, null=True)),
                ("vote", models.CharField(choices=[("up", "Up"), ("down", "Down")], max_length=8)),
                (
                    "notice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="audience_votes",
                        to="core.notice",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notice_votes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        condition=models.Q(("user__isnull", False)),
                        fields=("notice", "user"),
                        name="uniq_notice_audience_vote_user",
                    ),
                    models.UniqueConstraint(
                        condition=models.Q(("visitor_key__isnull", False)),
                        fields=("notice", "visitor_key"),
                        name="uniq_notice_audience_vote_visitor",
                    ),
                ],
            },
        ),
    ]
