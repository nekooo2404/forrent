import hashlib
import hmac
import logging

from django.conf import settings

from apps.common.models import AuditLog

logger = logging.getLogger("security.audit")

SENSITIVE_KEYS = {"password", "current_password", "old_password", "new_password", "confirm_password", "otp", "token", "refresh"}


def audit_hash(value):
    if value is None:
        return ""
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), str(value).encode("utf-8"), hashlib.sha256).hexdigest()[:16]


def client_ip(request):
    if not request:
        return None
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return forwarded_for.split(",")[0].strip() or request.META.get("REMOTE_ADDR")


def safe_metadata(metadata):
    safe = {}
    for key, value in (metadata or {}).items():
        safe[key] = "[redacted]" if key in SENSITIVE_KEYS else value
    return safe


def audit_event(event, *, request=None, actor=None, target=None, status=AuditLog.Status.SUCCESS, metadata=None):
    if actor is None and request is not None and getattr(request, "user", None) and request.user.is_authenticated:
        actor = request.user

    target_model = ""
    target_id = ""
    if target is not None:
        target_model = target._meta.label
        target_id = str(target.pk)

    try:
        AuditLog.objects.create(
            event=event,
            status=status,
            actor=actor if getattr(actor, "is_authenticated", False) else None,
            target_model=target_model,
            target_id=target_id,
            method=getattr(request, "method", "") if request else "",
            path=getattr(request, "path", "")[:255] if request else "",
            ip_address=client_ip(request),
            user_agent=(request.META.get("HTTP_USER_AGENT", "")[:1000] if request else ""),
            metadata=safe_metadata(metadata),
        )
        logger.info(
            "audit_event event=%s status=%s actor_id=%s target=%s:%s",
            event,
            status,
            getattr(actor, "id", None),
            target_model,
            target_id,
        )
    except Exception:
        logger.exception("audit_event_failed event=%s", event)


def audit_admin_action(request, action, target=None, metadata=None):
    if not request.path.startswith("/api/admin/"):
        return
    audit_event(
        f"admin.{action}",
        request=request,
        target=target,
        status=AuditLog.Status.SUCCESS,
        metadata=metadata,
    )
