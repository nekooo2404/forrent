from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.common.telegram import TelegramError, send_telegram_message
from apps.common.validators import normalize_vietnamese_phone, validate_vietnamese_phone


DEFAULT_MESSAGE = "ForRent - Ket noi Telegram da hoat dong."


def mask_phone(phone):
    return f"***{phone[-4:]}" if len(phone) >= 4 else "***"


class Command(BaseCommand):
    help = "Send a Telegram test message to the linked chat of a user identified by phone."

    def add_arguments(self, parser):
        parser.add_argument("--phone", required=True, help="ForRent account phone number.")
        parser.add_argument("--message", default=DEFAULT_MESSAGE, help="Plain-text test message.")

    def handle(self, *args, **options):
        phone = normalize_vietnamese_phone(options["phone"])
        try:
            validate_vietnamese_phone(phone)
        except ValidationError as exc:
            raise CommandError("Phone number is invalid.") from exc

        user = User.objects.filter(phone=phone, is_active=True).only("telegram_chat_id").first()
        if user is None:
            raise CommandError(f"No active user found for phone {mask_phone(phone)}.")
        if not user.telegram_chat_id:
            raise CommandError(f"User {mask_phone(phone)} has not linked Telegram.")

        try:
            result = send_telegram_message(
                chat_id=user.telegram_chat_id,
                text=options["message"],
            )
        except ImproperlyConfigured as exc:
            raise CommandError("TELEGRAM_BOT_TOKEN is not configured.") from exc
        except TelegramError as exc:
            raise CommandError("Telegram rejected the test message. Check the bot link and try again.") from exc

        message_id = result.get("message_id")
        suffix = f" (message {message_id})" if message_id is not None else ""
        self.stdout.write(
            self.style.SUCCESS(f"Telegram test sent to user {mask_phone(phone)}{suffix}.")
        )
