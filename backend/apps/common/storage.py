import json
import mimetypes
import urllib.error
import urllib.parse
import urllib.request
import uuid

import cloudinary
import cloudinary.api
import cloudinary.exceptions
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files.base import ContentFile
from django.core.files.storage import Storage


def clean_storage_name(name):
    parts = [part for part in str(name).replace("\\", "/").split("/") if part not in {"", "."}]
    if not parts or any(part == ".." for part in parts):
        raise SuspiciousFileOperation("Invalid storage path.")
    return "/".join(parts)


class SupabaseMediaStorage(Storage):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.key = settings.SUPABASE_SECRET_KEY
        self.timeout = settings.SUPABASE_STORAGE_TIMEOUT
        if not self.base_url or not self.bucket or not self.key:
            raise ImproperlyConfigured("SUPABASE_URL, SUPABASE_SECRET_KEY and SUPABASE_STORAGE_BUCKET are required.")

    def _clean_name(self, name):
        return clean_storage_name(name)

    def _object_url(self, name, public=False):
        bucket = urllib.parse.quote(self.bucket, safe="")
        path = urllib.parse.quote(self._clean_name(name), safe="/")
        prefix = "object/public" if public else "object"
        return f"{self.base_url}/storage/v1/{prefix}/{bucket}/{path}"

    def _headers(self, content_type=None, upsert=None):
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
        if content_type:
            headers["Content-Type"] = content_type
        if upsert is not None:
            headers["x-upsert"] = "true" if upsert else "false"
        return headers

    def _request(self, method, url, data=None, headers=None):
        request = urllib.request.Request(url, data=data, headers=headers or self._headers(), method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:300]
            raise OSError(f"Supabase storage {method} failed: {exc.code} {body}") from exc

    def _read(self, content):
        if hasattr(content, "seek"):
            content.seek(0)
        if hasattr(content, "chunks"):
            return b"".join(content.chunks())
        return content.read()

    def upload(self, name, content, *, upsert=False):
        name = self._clean_name(name)
        content_type = getattr(content, "content_type", None) or mimetypes.guess_type(name)[0] or "application/octet-stream"
        self._request(
            "POST",
            self._object_url(name),
            data=self._read(content),
            headers=self._headers(content_type=content_type, upsert=upsert),
        )
        return name

    def _save(self, name, content):
        return self.upload(name, content, upsert=False)

    def get_available_name(self, name, max_length=None):
        name = self._clean_name(name)
        folder, _, filename = name.rpartition("/")
        stem, dot, suffix = filename.rpartition(".")
        filename = f"{stem or filename}_{uuid.uuid4().hex[:12]}{dot}{suffix}" if dot else f"{filename}_{uuid.uuid4().hex[:12]}"
        return f"{folder}/{filename}" if folder else filename

    def _open(self, name, mode="rb"):
        if "r" not in mode:
            raise ValueError("Supabase storage only supports read mode.")
        return ContentFile(self._request("GET", self._object_url(name)), name=self._clean_name(name))

    def exists(self, name):
        request = urllib.request.Request(self._object_url(name), headers=self._headers(), method="HEAD")
        try:
            with urllib.request.urlopen(request, timeout=self.timeout):
                return True
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return False
            raise OSError(f"Supabase storage HEAD failed: {exc.code}") from exc

    def delete(self, name):
        try:
            self._request("DELETE", self._object_url(name))
        except OSError as exc:
            if "404" not in str(exc):
                raise

    def size(self, name):
        request = urllib.request.Request(self._object_url(name), headers=self._headers(), method="HEAD")
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            return int(response.headers.get("Content-Length", 0))

    def url(self, name):
        return self._object_url(name, public=True)


def create_public_bucket():
    storage = SupabaseMediaStorage()
    body = json.dumps({"id": storage.bucket, "name": storage.bucket, "public": True}).encode("utf-8")
    try:
        storage._request(
            "POST",
            f"{storage.base_url}/storage/v1/bucket",
            data=body,
            headers=storage._headers(content_type="application/json"),
        )
        return True
    except OSError as exc:
        message = str(exc).lower()
        if "409" in message or "already exists" in message or "duplicate" in message:
            return False
        raise


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

    def _save(self, name, content):
        name = self._clean_name(name)
        if hasattr(content, "seek"):
            content.seek(0)
        cloudinary.uploader.upload(
            content,
            public_id=self._public_id(name),
            resource_type="image",
            overwrite=False,
            eager=[
                {"width": 640, "crop": "limit", "fetch_format": "auto", "quality": "auto:eco"},
                {"width": 1200, "crop": "limit", "fetch_format": "auto", "quality": "auto:good"},
            ],
        )
        return name

    def get_available_name(self, name, max_length=None):
        name = self._clean_name(name)
        folder, _, filename = name.rpartition("/")
        stem, dot, suffix = filename.rpartition(".")
        filename = f"{stem or filename}_{uuid.uuid4().hex[:12]}{dot}{suffix}" if dot else f"{filename}_{uuid.uuid4().hex[:12]}"
        return f"{folder}/{filename}" if folder else filename

    def exists(self, name):
        try:
            cloudinary.api.resource(self._public_id(name), resource_type="image")
            return True
        except cloudinary.exceptions.NotFound:
            return False

    def delete(self, name):
        cloudinary.uploader.destroy(self._public_id(name), resource_type="image", invalidate=True)

    def url(self, name):
        url, _ = cloudinary.utils.cloudinary_url(
            self._public_id(name),
            resource_type="image",
            secure=True,
        )
        return url
