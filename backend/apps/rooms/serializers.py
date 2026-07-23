from urllib.parse import urlparse

from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.image_validation import (
    MAX_ROOM_MEDIA_UPLOAD_BYTES,
    uploaded_room_media_type,
    validate_uploaded_image_file,
    validate_uploaded_room_media_file,
)
from apps.locations.serializers import AmenitySerializer, AreaRangeSerializer, CitySerializer, WardSerializer
from apps.rooms.models import DepositType, Room, RoomImage, RoomSubtype
from apps.rooms.public_copy import public_room_description, public_room_title_for
from apps.viewing_requests.models import ViewingRequest


def allowed_room_image_url_hosts():
    hosts = {"res.cloudinary.com", "api.forrent.io.vn"}
    if settings.DEBUG:
        hosts.update({"localhost", "127.0.0.1", "backend"})
    return hosts


def validate_room_image_url(image_url):
    parsed = urlparse(image_url)
    if parsed.scheme != "https" and not (settings.DEBUG and parsed.scheme == "http"):
        raise serializers.ValidationError("Image URL must use HTTPS.")
    if parsed.hostname not in allowed_room_image_url_hosts():
        raise serializers.ValidationError("Image URL host is not allowed.")


class DepositTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepositType
        fields = ("id", "name", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class RoomSubtypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomSubtype
        fields = ("id", "parent_type", "name", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_parent_type(self, value):
        if value not in {Room.RoomType.CCMN, Room.RoomType.CCDV}:
            raise serializers.ValidationError("Room subtypes are supported for CCMN and CCDV only.")
        return value

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Subtype name is required.")
        return value

    def validate(self, attrs):
        parent_type = attrs.get("parent_type", getattr(self.instance, "parent_type", None))
        name = attrs.get("name", getattr(self.instance, "name", ""))
        if parent_type not in {Room.RoomType.CCMN, Room.RoomType.CCDV}:
            raise serializers.ValidationError({"parent_type": "Room subtypes are supported for CCMN and CCDV only."})
        if self.instance and parent_type != self.instance.parent_type and self.instance.rooms.exists():
            raise serializers.ValidationError({"parent_type": "Cannot change the room type of a subtype already in use."})
        queryset = RoomSubtype.objects.filter(parent_type=parent_type, name__iexact=name)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError({"name": "This subtype already exists for the selected room type."})
        return attrs


class RoomImageSerializer(serializers.ModelSerializer):
    label_display = serializers.CharField(source="get_label_display", read_only=True)

    class Meta:
        model = RoomImage
        fields = ("id", "image", "image_url", "media_type", "label", "label_display", "sort_order", "created_at")
        read_only_fields = ("id", "created_at")


class PublicRoomListSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    city = CitySerializer(read_only=True)
    ward = WardSerializer(read_only=True)
    area_range = AreaRangeSerializer(read_only=True)
    amenities = AmenitySerializer(many=True, read_only=True)
    deposit_type_name = serializers.SerializerMethodField()
    public_title = serializers.SerializerMethodField()
    room_subtype_name = serializers.SerializerMethodField()
    short_description = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "id",
            "title",
            "public_title",
            "slug",
            "room_type",
            "room_subtype",
            "room_subtype_name",
            "city",
            "ward",
            "address",
            "price",
            "deposit_type",
            "deposit_type_name",
            "deposit_amount",
            "electricity_price_per_kwh",
            "water_billing_type",
            "water_price_per_person",
            "water_price_per_cubic_meter",
            "service_fee",
            "actual_area",
            "area_range",
            "amenities",
            "short_description",
            "thumbnail",
            "thumbnail_url",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    @extend_schema_field(OpenApiTypes.URI)
    def get_thumbnail_url(self, obj):
        request = self.context.get("request")
        if obj.thumbnail:
            return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url
        media_items = list(obj.images.all())
        media_items.sort(key=lambda media: (media.label != RoomImage.Label.OVERVIEW, media.sort_order, media.id))
        for media in media_items:
            if media.media_type != RoomImage.MediaType.IMAGE:
                continue
            if media.image_url:
                return media.image_url
            if media.image:
                return request.build_absolute_uri(media.image.url) if request else media.image.url
        return None

    def get_deposit_type_name(self, obj):
        return obj.deposit_type_name_snapshot or (obj.deposit_type.name if obj.deposit_type_id else "")

    def get_public_title(self, obj):
        return public_room_title_for(obj)

    def get_title(self, obj):
        return public_room_title_for(obj)

    def get_short_description(self, obj):
        return public_room_description(obj.short_description)

    def get_room_subtype_name(self, obj):
        return obj.room_subtype.name if obj.room_subtype_id else ""


class PublicRoomDetailSerializer(PublicRoomListSerializer):
    description = serializers.SerializerMethodField()
    images = RoomImageSerializer(many=True, read_only=True)

    class Meta(PublicRoomListSerializer.Meta):
        fields = PublicRoomListSerializer.Meta.fields + ("description", "images")

    def get_description(self, obj):
        return public_room_description(
            obj.description,
            fallback="Th\u00f4ng tin chi ti\u1ebft \u0111ang \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt. Nh\u00e2n vi\u00ean t\u01b0 v\u1ea5n s\u1ebd x\u00e1c nh\u1eadn tr\u01b0\u1edbc l\u1ecbch xem.",
        )


class AdminRoomImageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ("image", "image_url", "media_type", "label", "sort_order")
        read_only_fields = ("media_type",)

    def validate_image_url(self, value):
        if value:
            validate_room_image_url(value)
        return value

    def validate_image(self, value):
        if not value:
            return value
        media_type = validate_uploaded_room_media_file(value, "image")
        if self.instance and media_type != self.instance.media_type:
            raise serializers.ValidationError("Replacement media must keep the existing image or video type.")
        return value

    def validate(self, attrs):
        image = attrs.get("image", getattr(self.instance, "image", None))
        image_url = attrs.get("image_url", getattr(self.instance, "image_url", ""))
        if not image and not image_url:
            raise serializers.ValidationError("Either image or image_url is required.")
        return attrs


class LandlordRoomImageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ("label", "sort_order")

    def validate(self, attrs):
        forbidden_fields = {"image", "image_url", "media_type"}.intersection(self.initial_data)
        if forbidden_fields:
            raise serializers.ValidationError(
                {field: "Upload new media through the room form." for field in sorted(forbidden_fields)}
            )
        return attrs


class AdminRoomSerializer(serializers.ModelSerializer):
    images = RoomImageSerializer(many=True, read_only=True)
    deposit_type_name = serializers.SerializerMethodField()
    public_title = serializers.SerializerMethodField()
    room_code = serializers.CharField(read_only=True)
    room_subtype_name = serializers.SerializerMethodField()
    uploaded_images = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
    )
    image_urls = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
    )
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    created_by_role = serializers.CharField(source="created_by.role", read_only=True)

    class Meta:
        model = Room
        fields = (
            "id",
            "room_code",
            "title",
            "public_title",
            "slug",
            "room_type",
            "room_subtype",
            "room_subtype_name",
            "city",
            "ward",
            "address",
            "building_code",
            "price",
            "deposit_type",
            "deposit_type_name",
            "deposit_amount",
            "electricity_price_per_kwh",
            "water_billing_type",
            "water_price_per_person",
            "water_price_per_cubic_meter",
            "service_fee",
            "actual_area",
            "area_range",
            "amenities",
            "short_description",
            "description",
            "thumbnail",
            "hero_eligible",
            "status",
            "commission_percent",
            "commission_base_amount",
            "estimated_commission_amount",
            "internal_note",
            "created_by",
            "created_by_name",
            "created_by_email",
            "created_by_role",
            "images",
            "uploaded_images",
            "image_urls",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "room_code",
            "public_title",
            "created_by",
            "created_by_name",
            "created_by_email",
            "created_by_role",
            "estimated_commission_amount",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        room_type = attrs.get("room_type") or getattr(self.instance, "room_type", None)
        room_subtype = attrs["room_subtype"] if "room_subtype" in attrs else getattr(self.instance, "room_subtype", None)
        city = attrs.get("city") or getattr(self.instance, "city", None)
        ward = attrs.get("ward") or getattr(self.instance, "ward", None)
        actual_area = attrs.get("actual_area") or getattr(self.instance, "actual_area", None)
        area_range = attrs.get("area_range") or getattr(self.instance, "area_range", None)
        commission_percent = attrs.get("commission_percent")
        errors = {}
        if room_subtype and room_subtype.parent_type != room_type:
            errors["room_subtype"] = "Room subtype must belong to the selected room type."
        if city and ward and ward.city_id != city.id:
            errors["ward"] = "Ward must belong to selected city."
        if actual_area is not None and area_range is not None:
            if actual_area < area_range.min_area or (area_range.max_area is not None and actual_area > area_range.max_area):
                errors["actual_area"] = "Actual area must be inside selected area range."
        if commission_percent is not None and commission_percent > 100:
            errors["commission_percent"] = "Commission percent cannot exceed 100."
        uploaded_images = attrs.get("uploaded_images") or []
        image_urls = attrs.get("image_urls") or []
        existing_count = self.instance.images.count() if self.instance else 0
        if existing_count + len(uploaded_images) + len(image_urls) > 12:
            errors["uploaded_images"] = "A room can have at most 12 gallery items."
        if sum(upload.size for upload in uploaded_images) > MAX_ROOM_MEDIA_UPLOAD_BYTES:
            errors["uploaded_images"] = "New gallery uploads must total 50MB or less."
        for upload in uploaded_images:
            try:
                validate_uploaded_room_media_file(upload, "uploaded_images")
            except serializers.ValidationError as exc:
                errors.update(exc.detail)
                break
        for image_url in image_urls:
            try:
                validate_room_image_url(image_url)
            except serializers.ValidationError as exc:
                errors["image_urls"] = exc.detail
                break
        thumbnail = attrs.get("thumbnail")
        if thumbnail:
            try:
                validate_uploaded_image_file(thumbnail, "thumbnail")
            except serializers.ValidationError as exc:
                errors.update(exc.detail)
        hero_eligible = attrs.get("hero_eligible", getattr(self.instance, "hero_eligible", False))
        effective_thumbnail = thumbnail if thumbnail is not None else getattr(self.instance, "thumbnail", None)
        if hero_eligible and not effective_thumbnail:
            errors["hero_eligible"] = "A homepage hero room requires a representative thumbnail."
        existing_overview = bool(
            self.instance
            and self.instance.images.filter(
                label=RoomImage.Label.OVERVIEW,
                media_type=RoomImage.MediaType.IMAGE,
            ).exists()
        )
        new_overview = bool(image_urls) or any(
            uploaded_room_media_type(upload) == RoomImage.MediaType.IMAGE
            for upload in uploaded_images
        )
        if hero_eligible and not (existing_overview or new_overview):
            errors["hero_eligible"] = "A homepage hero room requires an overview gallery image."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def validate_status(self, value):
        if value == Room.Status.RENTED and (not self.instance or self.instance.status != Room.Status.RENTED):
            raise serializers.ValidationError("Room can only become rented through lead conversion.")
        if self.instance and not Room.can_transition(self.instance.status, value):
            raise serializers.ValidationError(f"Cannot change room from {self.instance.status} to {value}.")
        return value

    def get_deposit_type_name(self, obj):
        return obj.deposit_type_name_snapshot or (obj.deposit_type.name if obj.deposit_type_id else "")

    def get_public_title(self, obj):
        return public_room_title_for(obj)

    def get_room_subtype_name(self, obj):
        return obj.room_subtype.name if obj.room_subtype_id else ""

    def create(self, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", [])
        image_urls = validated_data.pop("image_urls", [])
        amenities = validated_data.pop("amenities", [])
        room = Room.objects.create(**validated_data)
        room.amenities.set(amenities)
        self._create_images(room, uploaded_images, image_urls)
        return room

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", [])
        image_urls = validated_data.pop("image_urls", [])
        amenities = validated_data.pop("amenities", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if amenities is not None:
            instance.amenities.set(amenities)
        self._create_images(instance, uploaded_images, image_urls)
        return instance

    def _create_images(self, room, uploaded_images, image_urls):
        next_order = room.images.count()
        has_overview = room.images.filter(
            label=RoomImage.Label.OVERVIEW,
            media_type=RoomImage.MediaType.IMAGE,
        ).exists()
        for offset, upload in enumerate(uploaded_images):
            media_type = uploaded_room_media_type(upload)
            label = RoomImage.Label.VIDEO_TOUR
            if media_type == RoomImage.MediaType.IMAGE:
                label = RoomImage.Label.OTHER if has_overview else RoomImage.Label.OVERVIEW
                has_overview = True
            RoomImage.objects.create(
                room=room,
                image=upload,
                media_type=media_type,
                label=label,
                sort_order=next_order + offset,
            )
        next_order = room.images.count()
        for offset, image_url in enumerate(image_urls):
            label = RoomImage.Label.OTHER if has_overview else RoomImage.Label.OVERVIEW
            has_overview = True
            RoomImage.objects.create(
                room=room,
                image_url=image_url,
                label=label,
                sort_order=next_order + offset,
            )


class LandlordRoomSerializer(AdminRoomSerializer):
    CONTENT_EDITABLE_STATUSES = {Room.Status.DRAFT, Room.Status.HIDDEN}
    DELETABLE_STATUSES = {Room.Status.DRAFT, Room.Status.HIDDEN, Room.Status.ARCHIVED}
    can_delete = serializers.SerializerMethodField()

    class Meta(AdminRoomSerializer.Meta):
        fields = (
            "id",
            "room_code",
            "can_delete",
            "title",
            "public_title",
            "slug",
            "room_type",
            "room_subtype",
            "room_subtype_name",
            "city",
            "ward",
            "address",
            "price",
            "deposit_type",
            "deposit_type_name",
            "deposit_amount",
            "electricity_price_per_kwh",
            "water_billing_type",
            "water_price_per_person",
            "water_price_per_cubic_meter",
            "service_fee",
            "actual_area",
            "area_range",
            "amenities",
            "short_description",
            "description",
            "thumbnail",
            "status",
            "images",
            "uploaded_images",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "room_code",
            "can_delete",
            "public_title",
            "slug",
            "created_at",
            "updated_at",
        )

    def get_can_delete(self, obj):
        if obj.status not in self.DELETABLE_STATUSES:
            return False
        has_viewing_history = getattr(obj, "has_viewing_history", None)
        has_lease_history = getattr(obj, "has_lease_history", None)
        if has_viewing_history is None:
            has_viewing_history = obj.viewing_requests.exists()
        if has_lease_history is None:
            has_lease_history = obj.leases.exists()
        return not (has_viewing_history or has_lease_history)

    def validate_status(self, value):
        if value == Room.Status.RENTED:
            raise serializers.ValidationError("Use confirm rental with an eligible tenant to mark the room as rented.")
        if self.instance and not Room.can_transition(self.instance.status, value):
            raise serializers.ValidationError(f"Cannot change room from {self.instance.status} to {value}.")
        return value

    def validate(self, attrs):
        if "image_urls" in self.initial_data:
            raise serializers.ValidationError(
                {"image_urls": "Landlord accounts must upload media through ForRent storage."}
            )
        if self.instance and self.instance.status not in self.CONTENT_EDITABLE_STATUSES:
            changed_fields = set(attrs)
            if changed_fields - {"status"}:
                raise serializers.ValidationError(
                    {
                        "status": (
                            "Rooms under review, published, rented or archived are locked for direct edits. "
                            "Return the room to draft before changing its details."
                        )
                    }
                )
        return super().validate(attrs)

    def create(self, validated_data):
        status = validated_data.get("status", Room.Status.DRAFT)
        if status not in {Room.Status.DRAFT, Room.Status.PENDING_REVIEW, Room.Status.PUBLISHED}:
            raise serializers.ValidationError(
                {"status": "New landlord rooms must be draft, pending review or published."}
            )
        validated_data["status"] = status
        return super().create(validated_data)


class LandlordRentalCandidateSerializer(serializers.ModelSerializer):
    can_confirm_rental = serializers.SerializerMethodField()

    class Meta:
        model = ViewingRequest
        fields = (
            "id",
            "full_name",
            "phone",
            "email",
            "status",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "appointment_date",
            "appointment_time_slot",
            "can_confirm_rental",
            "created_at",
        )
        read_only_fields = fields

    def get_can_confirm_rental(self, obj):
        return obj.status in {ViewingRequest.Status.SCHEDULED, ViewingRequest.Status.VIEWED}


class LandlordConfirmRentalSerializer(serializers.Serializer):
    viewing_request_id = serializers.IntegerField(min_value=1)


class RoomFiltersSerializer(serializers.Serializer):
    cities = CitySerializer(many=True)
    wards = WardSerializer(many=True)
    amenities = AmenitySerializer(many=True)
    area_ranges = AreaRangeSerializer(many=True)
    deposit_types = DepositTypeSerializer(many=True)
    room_types = serializers.ListField()
    room_subtypes = RoomSubtypeSerializer(many=True)
    statuses = serializers.ListField()
