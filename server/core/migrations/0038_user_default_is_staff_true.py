# All users are staff: DB default + backfill existing rows.

from django.db import migrations, models


def set_all_users_is_staff(apps, schema_editor):
    User = apps.get_model("core", "User")
    User.objects.all().update(is_staff=True)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0037_alter_testimonial_order"),
    ]

    operations = [
        migrations.RunPython(set_all_users_is_staff, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="is_staff",
            field=models.BooleanField(
                default=True,
                help_text="Designates whether the user can log into this admin site.",
                verbose_name="staff status",
            ),
        ),
    ]
