import json
import logging


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "time": self.formatTime(record, self.datefmt),
        }
        request_id = getattr(record, "request_id", "")
        if request_id:
            payload["request_id"] = request_id
        for field in (
            "method",
            "path",
            "status_code",
            "status_class",
            "duration_ms",
            "event",
            "status",
            "actor_id",
            "target_model",
            "target_id",
            "ip_address",
            "metadata_fields",
            "cache_namespace",
            "cache_status",
            "task_id",
            "task_name",
            "task_state",
            "queue",
            "retries",
            "root_id",
            "parent_id",
            "exception_type",
            "records_deleted",
        ):
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)
