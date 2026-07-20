from functools import partial

from celery import Task
from django.db import OperationalError, transaction
from kombu.exceptions import OperationalError as KombuOperationalError

from apps.common.email import SendifyEmailTransientError
from apps.common.request_context import request_id_context


class ReliableEmailTask(Task):
    abstract = True
    autoretry_for = (OSError, OperationalError, SendifyEmailTransientError)
    retry_backoff = 2
    retry_backoff_max = 30
    retry_jitter = True
    max_retries = 3
    acks_late = True
    reject_on_worker_lost = True
    ignore_result = True
    soft_time_limit = 30
    time_limit = 45


class ReliableMaintenanceTask(Task):
    abstract = True
    autoretry_for = (OSError, OperationalError, KombuOperationalError)
    retry_backoff = 5
    retry_backoff_max = 60
    retry_jitter = True
    max_retries = 3
    acks_late = True
    reject_on_worker_lost = True
    ignore_result = False
    soft_time_limit = 5 * 60
    time_limit = 6 * 60


def enqueue_task_on_commit(task, *args, redact_args=False, **options):
    headers = dict(options.pop("headers", {}))
    request_id = request_id_context.get()
    if request_id:
        headers.setdefault("request_id", request_id)
    if headers:
        options["headers"] = headers
    if redact_args:
        options.setdefault("argsrepr", "(<redacted>)")

    transaction.on_commit(partial(task.apply_async, args=args, **options))
