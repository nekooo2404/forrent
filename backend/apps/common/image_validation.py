from pathlib import Path

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 24_000_000
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP", "AVIF"}
MAX_VIDEO_BYTES = 40 * 1024 * 1024
MAX_ROOM_MEDIA_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}


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


def uploaded_room_media_type(upload):
    content_type = (getattr(upload, "content_type", "") or "").lower()
    return "VIDEO" if content_type in ALLOWED_VIDEO_CONTENT_TYPES else "IMAGE"


def validate_uploaded_room_media_file(upload, field_name):
    media_type = uploaded_room_media_type(upload)
    if media_type == "IMAGE":
        validate_uploaded_image_file(upload, field_name)
        return media_type

    extension = Path(getattr(upload, "name", "")).suffix.lower()
    if extension not in ALLOWED_VIDEO_EXTENSIONS:
        raise serializers.ValidationError({field_name: "Only MP4, WebM and MOV videos are allowed."})
    if upload.size > MAX_VIDEO_BYTES:
        raise serializers.ValidationError({field_name: "Each video must be 40MB or smaller."})

    position = None
    if hasattr(upload, "tell"):
        try:
            position = upload.tell()
        except OSError:
            position = None

    try:
        if hasattr(upload, "seek"):
            upload.seek(0)
        header = upload.read(16)
    finally:
        if hasattr(upload, "seek"):
            upload.seek(position or 0)

    content_type = (getattr(upload, "content_type", "") or "").lower()
    is_webm = header.startswith(b"\x1a\x45\xdf\xa3")
    is_iso_video = len(header) >= 12 and header[4:8] == b"ftyp"
    if (content_type == "video/webm" and not is_webm) or (content_type != "video/webm" and not is_iso_video):
        raise serializers.ValidationError({field_name: "Upload a valid MP4, WebM or MOV video file."})

    return media_type
