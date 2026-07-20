import logging
import re
import time
import uuid

from apps.common.request_context import request_id_context


request_logger = logging.getLogger("request")
VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


class RequestIDMiddleware:
    header_name = "HTTP_X_REQUEST_ID"
    response_header = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        supplied_request_id = request.META.get(self.header_name, "")
        request_id = supplied_request_id if VALID_REQUEST_ID.fullmatch(supplied_request_id) else str(uuid.uuid4())
        request.id = request_id
        context_token = request_id_context.set(request_id)
        started_at = time.perf_counter()
        try:
            try:
                response = self.get_response(request)
            except Exception:
                duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
                request_logger.exception(
                    "request_failed",
                    extra={
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.path,
                        "duration_ms": duration_ms,
                    },
                )
                raise

            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            response[self.response_header] = request_id
            log = request_logger.warning if response.status_code >= 500 else request_logger.info
            log(
                "request_finished",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.path,
                    "status_code": response.status_code,
                    "status_class": f"{response.status_code // 100}xx",
                    "duration_ms": duration_ms,
                },
            )
            return response
        finally:
            request_id_context.reset(context_token)
