from urllib.parse import urlparse

from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.common.image_validation import validate_uploaded_image_file
from apps.locations.serializers import AmenitySerializer, AreaRangeSerializer, CitySerializer, WardSerializer
from apps.rooms.models import DepositType, Room, RoomImage


def allowed_room_image_url_hosts():
    hosts = {"res.cloudinary.com", "api.forrent.io.vn"}
    supabase_url = getattr(settings, "SUPABASE_URL", "")
    if supabase_url:
        parsed = urlparse(supabase_url)
        if parsed.hostname:
            hosts.add(parsed.hostname)
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


class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ("id", "image", "image_url", "sort_order", "created_at")
        read_only_fields = ("id", "created_at")


class PublicRoomListSerializer(serializers.ModelSerializer):
    city = CitySerializer(read_only=True)
    ward = WardSerializer(read_only=True)
    area_range = AreaRangeSerializer(read_only=True)
    amenities = AmenitySerializer(many=True, read_only=True)
    deposit_type_name = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "id",
            "title",
            "slug",
            "room_type",
            "city",
            "ward",
            "address",
            "price",
            "deposit_type",
            "deposit_type_name",
            "deposit_amount",
            "electricity_price_per_kwh",
            "water_price_per_person",
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
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return None

    def get_deposit_type_name(self, obj):
        return obj.deposit_type.name if obj.deposit_type_id else ""


class PublicRoomDetailSerializer(PublicRoomListSerializer):
    images = RoomImageSerializer(many=True, read_only=True)

    class Meta(PublicRoomListSerializer.Meta):
        fields = PublicRoomListSerializer.Meta.fields + ("description", "images")


class AdminRoomImageWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ("image", "image_url", "sort_order")

    def validate(self, attrs):
        if not attrs.get("image") and not attrs.get("image_url"):
            raise serializers.ValidationError("Either image or image_url is required.")
        return attrs


class AdminRoomSerializer(serializers.ModelSerializer):
    images = RoomImageSerializer(many=True, read_only=True)
    deposit_type_name = serializers.SerializerMethodField()
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )
    image_urls = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
    )
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Room
        fields = (
            "id",
            "title",
            "slug",
            "room_type",
            "city",
            "ward",
            "address",
            "price",
            "deposit_type",
            "deposit_type_name",
            "deposit_amount",
            "electricity_price_per_kwh",
            "water_price_per_person",
            "service_fee",
            "actual_area",
            "area_range",
            "amenities",
            "short_description",
            "description",
            "thumbnail",
            "status",
            "commission_percent",
            "commission_base_amount",
            "estimated_commission_amount",
            "internal_note",
            "created_by",
            "created_by_name",
            "images",
            "uploaded_images",
            "image_urls",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_by_name", "estimated_commission_amount", "created_at", "updated_at")

    def validate(self, attrs):
        city = attrs.get("city") or getattr(self.instance, "city", None)
        ward = attrs.get("ward") or getattr(self.instance, "ward", None)
        actual_area = attrs.get("actual_area") or getattr(self.instance, "actual_area", None)
        area_range = attrs.get("area_range") or getattr(self.instance, "area_range", None)
        commission_percent = attrs.get("commission_percent")
        errors = {}
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
            errors["uploaded_images"] = "A room can have at most 12 gallery images."
        for image in uploaded_images:
            try:
                validate_uploaded_image_file(image, "uploaded_images")
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
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def get_deposit_type_name(self, obj):
        return obj.deposit_type.name if obj.deposit_type_id else ""

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
        for offset, image in enumerate(uploaded_images):
            RoomImage.objects.create(room=room, image=image, sort_order=next_order + offset)
        next_order = room.images.count()
        for offset, image_url in enumerate(image_urls):
            RoomImage.objects.create(room=room, image_url=image_url, sort_order=next_order + offset)


class RoomFiltersSerializer(serializers.Serializer):
    cities = CitySerializer(many=True)
    wards = WardSerializer(many=True)
    amenities = AmenitySerializer(many=True)
    area_ranges = AreaRangeSerializer(many=True)
    deposit_types = DepositTypeSerializer(many=True)
    room_types = serializers.ListField()
    statuses = serializers.ListField()
