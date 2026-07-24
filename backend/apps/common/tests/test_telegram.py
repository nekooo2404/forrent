import json
from io import BytesIO
from unittest import mock
from urllib.error import HTTPError

import pytest
from django.test import override_settings

from apps.common.telegram import TelegramError, send_telegram_message


class TelegramResponse:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, _size):
        return json.dumps({"ok": True, "result": {"message_id": 42}}).encode("utf-8")


@override_settings(
    TELEGRAM_BOT_TOKEN="top-secret-token",
    TELEGRAM_API_BASE_URL="https://api.telegram.org",
    TELEGRAM_API_TIMEOUT=10,
)
def test_send_telegram_message_posts_json_without_parse_mode():
    with mock.patch("apps.common.telegram.urlopen", return_value=TelegramResponse()) as urlopen:
        result = send_telegram_message(chat_id="-1001234567890", text="Yêu cầu xem phòng mới")

    request = urlopen.call_args.args[0]
    payload = json.loads(request.data.decode("utf-8"))
    assert request.full_url.endswith("/bottop-secret-token/sendMessage")
    assert payload == {
        "chat_id": "-1001234567890",
        "text": "Yêu cầu xem phòng mới",
        "disable_web_page_preview": True,
    }
    assert result == {"message_id": 42}


@override_settings(
    TELEGRAM_BOT_TOKEN="top-secret-token",
    TELEGRAM_API_BASE_URL="https://api.telegram.org",
    TELEGRAM_API_TIMEOUT=10,
)
def test_telegram_http_error_never_exposes_bot_token():
    provider_error = HTTPError(
        "https://api.telegram.org/bottop-secret-token/sendMessage",
        401,
        "Unauthorized",
        hdrs=None,
        fp=BytesIO(b'{"ok": false}'),
    )

    with mock.patch("apps.common.telegram.urlopen", side_effect=provider_error):
        with pytest.raises(TelegramError) as exc_info:
            send_telegram_message(chat_id="123456789", text="Test")

    assert "top-secret-token" not in str(exc_info.value)
    assert exc_info.value.__cause__ is None
