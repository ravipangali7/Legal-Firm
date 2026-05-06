"""Drop CMS ContentItem / ContentTypeModel and the Content permission module."""

from django.db import migrations


def delete_content_permission_module(apps, schema_editor):
    PermissionModule = apps.get_model("core", "PermissionModule")
    PermissionModule.objects.filter(name="Content").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0027_appsettings_site_logo_site_favicon"),
    ]

    operations = [
        migrations.RunPython(delete_content_permission_module, migrations.RunPython.noop),
        migrations.DeleteModel(name="ContentItem"),
        migrations.DeleteModel(name="ContentTypeModel"),
    ]
