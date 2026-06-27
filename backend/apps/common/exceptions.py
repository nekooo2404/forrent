import logging

from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.views import exception_handler

from apps.common.responses import error_response

logger = logging.getLogger(__name__)


class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Duplicate data."
    default_code = "conflict"


def _message_for_status(status_code: int) -> str:
    return {
        400: "Validation error",
        401: "Unauthorized",
        403: "Permission denied",
        404: "Not found",
        409: "Duplicate data",
        500: "Internal server error",
    }.get(status_code, "Error")


def custom_exception_handler(exc, context):
    if isinstance(exc, IntegrityError):
        logger.warning("Integrity error", exc_info=exc)
        return error_response(
            message="Duplicate data",
            errors={"detail": "A unique constraint was violated."},
            status_code=status.HTTP_409_CONFLICT,
        )

    if isinstance(exc, ObjectDoesNotExist):
        return error_response(
            message="Not found",
            errors={"detail": "Requested object does not exist."},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API exception", exc_info=exc)
        return error_response(
            message="Internal server error",
            errors={"detail": "Unexpected server error."},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    errors = response.data
    if isinstance(exc, ValidationError):
        message = "Validation error"
    else:
        message = _message_for_status(response.status_code)
        if isinstance(errors, dict) and "detail" in errors:
            message = str(errors["detail"])

    return error_response(message=message, errors=errors, status_code=response.status_code)
