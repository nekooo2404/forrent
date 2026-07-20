from celery import shared_task
from django.conf import settings
from django.core.cache import caches
from django.utils import timezone


CELERY_PIPELINE_HEARTBEAT_KEY = "celery:pipeline:heartbeat"


@shared_task(ignore_result=True, acks_late=False)
def record_celery_heartbeat():
    heartbeat_at = timezone.now().isoformat()
    caches["coordination"].set(
        CELERY_PIPELINE_HEARTBEAT_KEY,
        heartbeat_at,
        timeout=settings.CELERY_PIPELINE_HEARTBEAT_TTL,
    )
    return heartbeat_at

