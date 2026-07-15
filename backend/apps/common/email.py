import json
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend


class SendifyEmailError(RuntimeError):
    pass


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
                for recipient in recipients:
                    payload = {
                        "from": email_message.from_email,
                        "to": recipient,
                        "subject": email_message.subject,
                    }
                    if email_message.content_subtype == "html":
                        payload["html"] = email_message.body
                    else:
                        payload["text"] = email_message.body
                        for content, mimetype in getattr(email_message, "alternatives", ()):
                            if mimetype == "text/html":
                                payload["html"] = content
                                break

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
