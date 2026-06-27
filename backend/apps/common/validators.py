import re

from django.core.exceptions import ValidationError


PHONE_PATTERN = re.compile(r"^(0|\+84)[0-9]{9,10}$")


def validate_vietnamese_phone(value: str) -> None:
    if not PHONE_PATTERN.match(value or ""):
        raise ValidationError("Phone number must be a valid Vietnamese phone number.")
