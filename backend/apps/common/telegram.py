import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class TelegramError(RuntimeError):
    pass


class TelegramTransientError(TelegramError):
    pass


RETRYABLE_TELEGRAM_STATUSES = {408, 425, 429}
MAX_TELEGRAM_RESPONSE_BYTES = 1024 * 1024


def _status_error(status):
    error_class = TelegramTransientError if status in RETRYABLE_TELEGRAM_STATUSES or status >= 500 else TelegramError
    return error_class(f"Telegram returned HTTP {status}.")


def send_telegram_message(*, chat_id, text):
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise ImproperlyConfigured("TELEGRAM_BOT_TOKEN is required to send Telegram notifications.")

    endpoint = f"{settings.TELEGRAM_API_BASE_URL.rstrip('/')}/bot{token}/sendMessage"
    payload = {
        "chat_id": str(chat_id),
        "text": str(text),
        "disable_web_page_preview": True,
    }
    request = Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=settings.TELEGRAM_API_TIMEOUT) as response:
            if not 200 <= response.status < 300:
                raise _status_error(response.status)
            raw_payload = response.read(MAX_TELEGRAM_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        raise _status_error(exc.code) from None
    except OSError:
        raise TelegramTransientError("Unable to send Telegram notification.") from None

    if len(raw_payload) > MAX_TELEGRAM_RESPONSE_BYTES:
        raise TelegramError("Telegram response is too large.")
    try:
        response_payload = json.loads(raw_payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise TelegramError("Telegram returned invalid JSON.") from None
    if not isinstance(response_payload, dict) or response_payload.get("ok") is not True:
        raise TelegramError("Telegram rejected the notification.")
    result = response_payload.get("result")
    return {"message_id": result.get("message_id")} if isinstance(result, dict) else {}
