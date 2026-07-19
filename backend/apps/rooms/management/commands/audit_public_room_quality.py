import re
from urllib.parse import urlparse

from django.core.management.base import BaseCommand, CommandError

from apps.rooms.models import Room, RoomImage
from apps.rooms.public_copy import normalize_search_text, public_room_title_for


ALLOWED_MEDIA_HOSTS = {"res.cloudinary.com", "api.forrent.io.vn"}
EMOJI_RE = re.compile("[\U0001f300-\U0001faff\u2600-\u27bf]")
INTERNAL_PREFIX_RE = re.compile(r"^\s*(?:p|phong|phòng|room|can|căn|ma|mã)\s*[-_.]?\s*\d{2,}\b", re.IGNORECASE)
INTERNAL_TITLE_TOKENS = {"CCMN", "CCDV"}


class Command(BaseCommand):
    help = "Audit published rooms for UI/UX content and media quality before production release."

    def add_arguments(self, parser):
        parser.add_argument(
            "--min-gallery-items",
            type=int,
            default=1,
            help="Minimum gallery media items required for each published room.",
        )
        parser.add_argument(
            "--require-cloudinary",
            action="store_true",
            help="Require thumbnail and gallery media URLs to resolve from Cloudinary.",
        )
        parser.add_argument(
            "--warn-only",
            action="store_true",
            help="Print issues without failing the command.",
        )

    def handle(self, *args, **options):
        min_gallery_items = max(options["min_gallery_items"], 0)
        require_cloudinary = options["require_cloudinary"]
        warn_only = options["warn_only"]

        rooms = (
            Room.objects.filter(status=Room.Status.PUBLISHED)
            .select_related("city", "ward", "room_subtype")
            .prefetch_related("images")
            .order_by("id")
        )
        issues = []
        checked = 0
        for room in rooms:
            checked += 1
            issues.extend(self._title_issues(room))
            issues.extend(self._media_issues(room, min_gallery_items, require_cloudinary))

        for issue in issues:
            self.stdout.write(self.style.ERROR(issue))
        self.stdout.write(f"checked={checked} issues={len(issues)}")

        if issues and not warn_only:
            raise CommandError(f"Public room quality audit failed with {len(issues)} issue(s).")

    def _title_issues(self, room):
        title = public_room_title_for(room)
        room_label = self._room_label(room)
        issues = []
        if not title:
            issues.append(f"{room_label}: title is empty.")
            return issues
        if len(title) > 90:
            issues.append(f"{room_label}: title is too long for stable room cards ({len(title)} chars, max 90).")
        if EMOJI_RE.search(title):
            issues.append(f"{room_label}: title contains emoji; use professional renter-facing copy.")
        if INTERNAL_PREFIX_RE.search(title):
            issues.append(f"{room_label}: title starts with an internal room code.")
        upper_title = title.upper()
        for token in INTERNAL_TITLE_TOKENS:
            if token in upper_title:
                issues.append(f"{room_label}: title contains internal abbreviation {token}.")
        letters = [char for char in title if char.isalpha()]
        if len(letters) >= 12:
            uppercase_ratio = sum(1 for char in letters if char.isupper()) / len(letters)
            if uppercase_ratio > 0.65:
                issues.append(f"{room_label}: title is mostly uppercase; use sentence case.")
        location = room.ward.name if room.ward_id else room.city.name
        if location and normalize_search_text(location) not in normalize_search_text(title):
            issues.append(f"{room_label}: public title must include a renter-facing location.")
        return issues

    def _media_issues(self, room, min_gallery_items, require_cloudinary):
        room_label = self._room_label(room)
        issues = []
        thumbnail_source = self._file_source(room.thumbnail)
        if not thumbnail_source:
            issues.append(f"{room_label}: missing thumbnail for listing cards and homepage hero.")
        elif require_cloudinary and not self._cloudinary_source(thumbnail_source):
            issues.append(f"{room_label}: thumbnail is not served from Cloudinary.")

        media_items = list(room.images.all())
        if len(media_items) < min_gallery_items:
            issues.append(
                f"{room_label}: gallery has {len(media_items)} item(s), requires at least {min_gallery_items}."
            )

        image_items = [item for item in media_items if item.media_type == RoomImage.MediaType.IMAGE]
        if not image_items:
            issues.append(f"{room_label}: gallery needs at least one still image; video-only galleries hurt scanning.")

        overview_items = [item for item in image_items if item.label == RoomImage.Label.OVERVIEW]
        if room.hero_eligible and not overview_items:
            issues.append(f"{room_label}: homepage hero rooms require an OVERVIEW gallery image.")
        if room.hero_eligible and not thumbnail_source:
            issues.append(f"{room_label}: homepage hero rooms require a representative thumbnail.")

        for item in media_items:
            if not item.label:
                issues.append(f"{room_label}: gallery item {item.id or 'new'} needs a semantic media label.")
            source = self._media_source(item)
            if not source:
                issues.append(f"{room_label}: gallery item {item.id or 'new'} has no media source.")
                continue
            if require_cloudinary and not self._cloudinary_source(source):
                issues.append(f"{room_label}: gallery item {item.id or 'new'} is not served from Cloudinary.")
            elif self._absolute_host(source) and self._absolute_host(source) not in ALLOWED_MEDIA_HOSTS:
                issues.append(f"{room_label}: gallery item {item.id or 'new'} uses an unapproved media host.")
        return issues

    def _room_label(self, room):
        return f"room id={room.id} slug={room.slug or '-'}"

    def _media_source(self, item):
        if item.image_url:
            return item.image_url
        return self._file_source(item.image)

    def _file_source(self, file_field):
        if not file_field:
            return ""
        try:
            return file_field.url
        except Exception:
            return str(file_field)

    def _absolute_host(self, source):
        parsed = urlparse(source)
        return parsed.hostname if parsed.scheme in {"http", "https"} else ""

    def _cloudinary_source(self, source):
        return self._absolute_host(source) == "res.cloudinary.com"
