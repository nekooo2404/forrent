from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from apps.common.storage import SupabaseMediaStorage, create_public_bucket


class Command(BaseCommand):
    help = "Upload existing MEDIA_ROOT files to the configured Supabase Storage bucket."

    def add_arguments(self, parser):
        parser.add_argument("--create-bucket", action="store_true")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        if not isinstance(default_storage, SupabaseMediaStorage):
            raise CommandError("Default storage is not SupabaseMediaStorage. Check SUPABASE_* env vars.")

        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            self.stdout.write("MEDIA_ROOT does not exist, nothing to upload.")
            return

        if options["create_bucket"]:
            created = create_public_bucket()
            self.stdout.write("Created Supabase bucket." if created else "Supabase bucket already exists.")

        files = [path for path in media_root.rglob("*") if path.is_file()]
        if options["dry_run"]:
            for path in files:
                self.stdout.write(path.relative_to(media_root).as_posix())
            self.stdout.write(f"{len(files)} files found.")
            return

        for path in files:
            name = path.relative_to(media_root).as_posix()
            with path.open("rb") as handle:
                default_storage.upload(name, File(handle), upsert=True)
            self.stdout.write(f"uploaded {name}")

        self.stdout.write(self.style.SUCCESS(f"Uploaded {len(files)} files to Supabase Storage."))
