import logging
import threading
import time

from celery.signals import task_failure, task_postrun, task_prerun, task_retry


logger = logging.getLogger("celery.lifecycle")
_started_at = {}
_started_at_lock = threading.Lock()


def _task_extra(task_id, task):
    request = getattr(task, "request", None)
    headers = getattr(request, "headers", None) or {}
    delivery_info = getattr(request, "delivery_info", None) or {}
    return {
        "event": "celery_task",
        "request_id": headers.get("request_id", ""),
        "task_id": task_id,
        "task_name": getattr(task, "name", ""),
        "queue": delivery_info.get("routing_key", ""),
        "retries": getattr(request, "retries", 0),
        "root_id": getattr(request, "root_id", "") or "",
        "parent_id": getattr(request, "parent_id", "") or "",
    }


def task_started(task_id=None, task=None, sender=None, **_kwargs):
    task = task or sender
    with _started_at_lock:
        _started_at[task_id] = time.perf_counter()
    logger.info("celery_task_started", extra={**_task_extra(task_id, task), "task_state": "STARTED"})


def task_finished(task_id=None, task=None, sender=None, state=None, **_kwargs):
    task = task or sender
    with _started_at_lock:
        started_at = _started_at.pop(task_id, None)
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2) if started_at is not None else 0
    extra = {
        **_task_extra(task_id, task),
        "task_state": state or "UNKNOWN",
        "duration_ms": duration_ms,
    }
    log = logger.error if state == "FAILURE" else logger.info
    log("celery_task_finished", extra=extra)


def task_will_retry(request=None, reason=None, **_kwargs):
    task = getattr(request, "task", None)
    extra = {
        "event": "celery_task",
        "task_id": getattr(request, "id", ""),
        "task_name": getattr(task, "name", "") or str(task or ""),
        "task_state": "RETRY",
        "retries": getattr(request, "retries", 0),
        "exception_type": type(reason).__name__ if reason else "",
    }
    logger.warning("celery_task_retry", extra=extra)


def task_failed(task_id=None, exception=None, sender=None, **_kwargs):
    logger.error(
        "celery_task_failed",
        extra={
            **_task_extra(task_id, sender),
            "task_state": "FAILURE",
            "exception_type": type(exception).__name__ if exception else "",
        },
    )


task_prerun.connect(task_started, weak=False, dispatch_uid="forrent-celery-task-started")
task_postrun.connect(task_finished, weak=False, dispatch_uid="forrent-celery-task-finished")
task_retry.connect(task_will_retry, weak=False, dispatch_uid="forrent-celery-task-retry")
task_failure.connect(task_failed, weak=False, dispatch_uid="forrent-celery-task-failed")
