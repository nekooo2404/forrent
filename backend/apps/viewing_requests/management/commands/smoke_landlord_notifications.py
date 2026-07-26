import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.common.validators import normalize_vietnamese_phone
from apps.rooms.models import Room
from apps.viewing_requests.models import LandlordNotification, ViewingRequest
from apps.viewing_requests.tasks import send_landlord_viewing_request_notification


SMOKE_EMAIL_PREFIX = "forrent-notification-smoke+"
SMOKE_FULL_NAME = "ForRent notification smoke tenant"


def mask_phone(phone):
    return f"***{phone[-4:]}" if len(phone) >= 4 else "***"


def unused_smoke_phone():
    for _attempt in range(20):
        candidate = f"038{secrets.randbelow(10_000_000):07d}"
        if not User.objects.filter(phone=candidate).exists():
            return candidate
    raise CommandError("Unable to allocate a unique smoke phone number.")


class Command(BaseCommand):
    help = "Create or clean owner-scoped smoke data for web and Telegram notifications."

    def add_arguments(self, parser):
        parser.add_argument("--phone", required=True, help="Landlord account phone number.")
        parser.add_argument("--room-id", type=int, help="Published room owned by the landlord.")
        parser.add_argument("--apply", action="store_true", help="Required before changing data.")
        parser.add_argument(
            "--deliver-telegram",
            action="store_true",
            help="Send the real Telegram notification after creating web smoke data.",
        )
        parser.add_argument(
            "--cleanup",
            action="store_true",
            help="Delete smoke viewing requests and tenants owned by this landlord.",
        )

    def handle(self, *args, **options):
        phone = normalize_vietnamese_phone(options["phone"])
        landlord = User.objects.filter(
            phone=phone,
            role=User.Role.LANDLORD,
            is_active=True,
        ).first()
        if landlord is None:
            raise CommandError(f"No active landlord found for {mask_phone(phone)}.")

        if options["cleanup"]:
            if not options["apply"]:
                raise CommandError("Cleanup requires --apply.")
            self._cleanup(landlord)
            return

        room_queryset = Room.objects.filter(
            created_by=landlord,
            status=Room.Status.PUBLISHED,
        ).order_by("-created_at")
        if options["room_id"]:
            room_queryset = room_queryset.filter(pk=options["room_id"])
        room = room_queryset.first()
        if room is None:
            raise CommandError("The landlord has no matching published room for this smoke test.")

        if options["deliver_telegram"]:
            if not landlord.telegram_chat_id:
                raise CommandError(f"Landlord {mask_phone(phone)} has not linked Telegram.")
            if not settings.TELEGRAM_BOT_TOKEN:
                raise CommandError("TELEGRAM_BOT_TOKEN is not configured.")

        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run: would create a web notification for landlord {mask_phone(phone)} "
                    f"and room {room.id}. Add --apply to continue."
                )
            )
            return

        viewing_request, notification = self._create_smoke_data(landlord=landlord, room=room)
        telegram_delivered = False
        if options["deliver_telegram"]:
            # This smoke command verifies web and Telegram only; do not send a real email.
            notification.email_sent_at = timezone.now()
            notification.save(update_fields=["email_sent_at", "updated_at"])
            try:
                result = send_landlord_viewing_request_notification(notification.id)
            except Exception as exc:
                raise CommandError(
                    f"Smoke data created, but Telegram delivery failed for notification {notification.id}."
                ) from exc
            telegram_delivered = bool(result.get("telegram_delivered"))
            if not telegram_delivered:
                raise CommandError(
                    f"Smoke data created, but Telegram was not delivered for notification {notification.id}."
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Smoke notification created: viewing_request={viewing_request.id} "
                f"notification={notification.id} telegram_delivered={str(telegram_delivered).lower()}."
            )
        )
        self.stdout.write("Open /landlord/viewing-requests or the notification bell to verify the web feed.")
        self.stdout.write("Cleanup: rerun this command with the same --phone value, --cleanup and --apply.")

    @staticmethod
    @transaction.atomic
    def _create_smoke_data(*, landlord, room):
        tenant = User.objects.create_user(
            email=f"{SMOKE_EMAIL_PREFIX}{uuid.uuid4().hex}@example.invalid",
            phone=unused_smoke_phone(),
            password=None,
            full_name=SMOKE_FULL_NAME,
            role=User.Role.TENANT,
        )
        viewing_request = ViewingRequest.objects.create(
            user=tenant,
            room=room,
            full_name=SMOKE_FULL_NAME,
            phone=tenant.phone,
            email=tenant.email,
            preferred_viewing_date=timezone.localdate() + timedelta(days=1),
            preferred_viewing_time_slot=ViewingRequest.TimeSlot.MORNING,
            status=ViewingRequest.Status.NEW,
            estimated_commission_amount=room.estimated_commission_amount,
        )
        notification = LandlordNotification.objects.create(
            recipient=landlord,
            viewing_request=viewing_request,
            type=LandlordNotification.Type.NEW_VIEWING_REQUEST,
        )
        return viewing_request, notification

    def _cleanup(self, landlord):
        with transaction.atomic():
            smoke_requests = ViewingRequest.objects.select_for_update().filter(
                room__created_by=landlord,
                email__startswith=SMOKE_EMAIL_PREFIX,
            )
            request_ids = list(smoke_requests.values_list("id", flat=True))
            tenant_ids = list(smoke_requests.values_list("user_id", flat=True))
            notification_count = LandlordNotification.objects.filter(
                viewing_request_id__in=request_ids,
            ).count()
            request_count = len(request_ids)
            smoke_requests.delete()
            smoke_tenants = User.objects.filter(
                id__in=tenant_ids,
                email__startswith=SMOKE_EMAIL_PREFIX,
            )
            tenant_count = smoke_tenants.count()
            smoke_tenants.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Smoke cleanup complete: notifications={notification_count} "
                f"viewing_requests={request_count} tenants={tenant_count}."
            )
        )
