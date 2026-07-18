from django.core.management.base import BaseCommand

from apps.rooms.models import Room
from apps.rooms.public_copy import public_room_title


class Command(BaseCommand):
    help = "Strip internal codes, emoji, and campaign/status copy from room titles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist the sanitized title changes. Without this flag the command is dry-run only.",
        )
        parser.add_argument(
            "--status",
            action="append",
            help="Limit to one or more room statuses. Defaults to all rooms.",
        )

    def handle(self, *args, **options):
        should_apply = options["apply"]
        statuses = options["status"] or []
        rooms = Room.objects.select_related("city", "ward").order_by("id")
        if statuses:
            rooms = rooms.filter(status__in=statuses)

        changed = 0
        checked = 0
        for room in rooms:
            checked += 1
            cleaned = public_room_title(
                room.title,
                proper_nouns=[room.city.name if room.city_id else "", room.ward.name if room.ward_id else ""],
            )
            if cleaned == room.title:
                continue

            changed += 1
            self.stdout.write(f"room id={room.id} slug={room.slug or '-'}: {room.title!r} -> {cleaned!r}")
            if should_apply:
                room.title = cleaned
                room.save(update_fields=("title", "updated_at"))

        mode = "applied" if should_apply else "dry_run"
        self.stdout.write(f"mode={mode} checked={checked} changed={changed}")
