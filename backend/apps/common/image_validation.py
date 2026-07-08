from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 24_000_000
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "AVIF"}


def validate_uploaded_image_file(image, field_name):
    content_type = (getattr(image, "content_type", "") or "").lower()
    if content_type and content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise serializers.ValidationError({field_name: "Only JPEG, PNG, WebP and AVIF images are allowed."})
    if image.size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError({field_name: "Each image must be 5MB or smaller."})

    position = None
    if hasattr(image, "tell"):
        try:
            position = image.tell()
        except OSError:
            position = None

    try:
        if hasattr(image, "seek"):
            image.seek(0)
        with Image.open(image) as opened:
            image_format = opened.format
            width, height = opened.size
            opened.verify()
    except (OSError, UnidentifiedImageError) as exc:
        raise serializers.ValidationError({field_name: "Upload a valid image file."}) from exc
    finally:
        if hasattr(image, "seek"):
            image.seek(position or 0)

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise serializers.ValidationError({field_name: "Only JPEG, PNG, WebP and AVIF images are allowed."})
    if width * height > MAX_IMAGE_PIXELS:
        raise serializers.ValidationError({field_name: "Image dimensions are too large."})
