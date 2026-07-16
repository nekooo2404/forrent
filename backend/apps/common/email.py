import json
from html import escape
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend


class SendifyEmailError(RuntimeError):
    pass


MAX_SENDIFY_TEMPLATE_RESPONSE_BYTES = 2 * 1024 * 1024


def fetch_sendify_templates():
    if not settings.SENDIFY_ACCOUNT_KEY:
        raise ImproperlyConfigured("SENDIFY_ACCOUNT_KEY is required to fetch Sendify templates.")

    request = Request(
        settings.SENDIFY_TEMPLATES_URL,
        headers={
            "Authorization": f"Bearer {settings.SENDIFY_ACCOUNT_KEY}",
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=settings.SENDIFY_API_TIMEOUT) as response:
            if not 200 <= response.status < 300:
                raise SendifyEmailError(f"Sendify returned HTTP {response.status}.")
            raw_payload = response.read(MAX_SENDIFY_TEMPLATE_RESPONSE_BYTES + 1)
    except OSError as exc:
        raise SendifyEmailError("Unable to fetch Sendify templates.") from exc

    if len(raw_payload) > MAX_SENDIFY_TEMPLATE_RESPONSE_BYTES:
        raise SendifyEmailError("Sendify template response is too large.")

    try:
        payload = json.loads(raw_payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SendifyEmailError("Sendify returned invalid JSON.") from exc

    if not isinstance(payload, dict):
        raise SendifyEmailError("Sendify returned an invalid template response.")

    templates = {}
    for group in ("shared", "personal"):
        items = payload.get(group, [])
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            raise SendifyEmailError("Sendify returned an invalid template response.")
        templates[group] = items

    return templates


class SendifyEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        if not settings.SENDIFY_API_KEY:
            raise ImproperlyConfigured("SENDIFY_API_KEY is required for SendifyEmailBackend.")

        sent = 0
        for email_message in email_messages:
            recipients = email_message.recipients()
            if not recipients:
                continue

            try:
                html = email_message.body if email_message.content_subtype == "html" else ""
                for content, mimetype in getattr(email_message, "alternatives", ()):
                    if mimetype == "text/html":
                        html = content
                        break
                if not html:
                    text = escape(email_message.body).replace("\r\n", "\n").replace("\r", "\n")
                    html = f"<p>{text.replace(chr(10), '<br>')}</p>"

                payload = {
                    "from": email_message.from_email,
                    "to": recipients,
                    "subject": email_message.subject,
                    "html": html,
                }
                request = Request(
                    settings.SENDIFY_API_URL,
                    data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {settings.SENDIFY_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    method="POST",
                )
                with urlopen(request, timeout=settings.SENDIFY_API_TIMEOUT) as response:
                    if not 200 <= response.status < 300:
                        raise SendifyEmailError(f"Sendify returned HTTP {response.status}.")
            except (OSError, SendifyEmailError):
                if not self.fail_silently:
                    raise
            else:
                sent += 1

        return sent
