from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from apps.common.storage import CloudinaryMediaStorage


class Command(BaseCommand):
    help = "Upload existing MEDIA_ROOT files to Cloudinary while preserving database file names."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        if not isinstance(default_storage, CloudinaryMediaStorage):
            raise CommandError("Default storage is not CloudinaryMediaStorage. Check CLOUDINARY_* env vars.")

        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            self.stdout.write("MEDIA_ROOT does not exist, nothing to upload.")
            return

        files = sorted(path for path in media_root.rglob("*") if path.is_file())
        if options["dry_run"]:
            for path in files:
                self.stdout.write(path.relative_to(media_root).as_posix())
            self.stdout.write(f"{len(files)} files found.")
            return

        uploaded = 0
        skipped = 0
        for path in files:
            name = path.relative_to(media_root).as_posix()
            if default_storage.exists(name):
                skipped += 1
                self.stdout.write(f"skipped {name}")
                continue

            with path.open("rb") as handle:
                default_storage._save(name, File(handle))
            uploaded += 1
            self.stdout.write(f"uploaded {name}")

        self.stdout.write(self.style.SUCCESS(f"Uploaded {uploaded} files to Cloudinary, skipped {skipped}."))
