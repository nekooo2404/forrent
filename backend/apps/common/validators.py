import re

from django.core.exceptions import ValidationError


PHONE_PATTERN = re.compile(r"^0[0-9]{9,10}$")


def normalize_vietnamese_phone(value: str) -> str:
    normalized = (value or "").strip().replace(" ", "").replace("-", "").replace(".", "")
    if normalized.startswith("+84"):
        return f"0{normalized[3:]}"
    return normalized


def validate_vietnamese_phone(value: str) -> None:
    if not PHONE_PATTERN.match(normalize_vietnamese_phone(value)):
        raise ValidationError("Phone number must be a valid Vietnamese phone number.")
