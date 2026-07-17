import uuid
from pathlib import Path

import cloudinary
import cloudinary.api
import cloudinary.exceptions
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files.storage import Storage


def clean_storage_name(name):
    parts = [part for part in str(name).replace("\\", "/").split("/") if part not in {"", "."}]
    if not parts or any(part == ".." for part in parts):
        raise SuspiciousFileOperation("Invalid storage path.")
    return "/".join(parts)


class CloudinaryMediaStorage(Storage):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cloud_name = settings.CLOUDINARY_CLOUD_NAME
        self.api_key = settings.CLOUDINARY_API_KEY
        self.api_secret = settings.CLOUDINARY_API_SECRET
        if not self.cloud_name or not self.api_key or not self.api_secret:
            raise ImproperlyConfigured("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required.")
        cloudinary.config(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
            secure=True,
        )

    def _clean_name(self, name):
        return clean_storage_name(name)

    def _public_id(self, name):
        name = self._clean_name(name)
        folder, _, filename = name.rpartition("/")
        stem, dot, _ = filename.rpartition(".")
        filename = stem if dot else filename
        return f"{folder}/{filename}" if folder else filename

    def _resource_type(self, name, content=None):
        content_type = (getattr(content, "content_type", "") or "").lower()
        return "video" if content_type.startswith("video/") or Path(name).suffix.lower() in {".mp4", ".webm", ".mov"} else "image"

    def _save(self, name, content):
        name = self._clean_name(name)
        if hasattr(content, "seek"):
            content.seek(0)
        resource_type = self._resource_type(name, content)
        upload_options = {
            "public_id": self._public_id(name),
            "resource_type": resource_type,
            "overwrite": False,
        }
        if settings.CLOUDINARY_UPLOAD_MODERATION:
            upload_options["moderation"] = settings.CLOUDINARY_UPLOAD_MODERATION
        if resource_type == "image":
            upload_options["eager"] = [
                {"width": 640, "crop": "limit", "fetch_format": "auto", "quality": "auto:eco"},
                {"width": 1200, "crop": "limit", "fetch_format": "auto", "quality": "auto:good"},
            ]
        cloudinary.uploader.upload(content, **upload_options)
        return name

    def get_available_name(self, name, max_length=None):
        name = self._clean_name(name)
        folder, _, filename = name.rpartition("/")
        _, dot, suffix = filename.rpartition(".")
        extension = f".{suffix.lower()}" if dot else ""
        random_name = f"{uuid.uuid4().hex}{extension}"
        available_name = f"{folder}/{random_name}" if folder else random_name
        if max_length and len(available_name) > max_length:
            raise SuspiciousFileOperation("Storage path exceeds max_length.")
        return available_name

    def exists(self, name):
        try:
            cloudinary.api.resource(self._public_id(name), resource_type=self._resource_type(name))
            return True
        except cloudinary.exceptions.NotFound:
            return False

    def delete(self, name):
        cloudinary.uploader.destroy(self._public_id(name), resource_type=self._resource_type(name), invalidate=True)

    def url(self, name):
        resource_type = self._resource_type(name)
        video_format = Path(name).suffix.removeprefix(".") if resource_type == "video" else None
        url, _ = cloudinary.utils.cloudinary_url(
            self._public_id(name),
            resource_type=resource_type,
            format=video_format,
            secure=True,
        )
        return url
