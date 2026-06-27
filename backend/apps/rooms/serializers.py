from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.locations.serializers import AmenitySerializer, AreaRangeSerializer, CitySerializer, WardSerializer
from apps.rooms.models import Room, RoomImage


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
        if city and ward and ward.city_id != city.id:
            raise serializers.ValidationError({"ward": "Ward must belong to selected city."})
        return attrs

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
    room_types = serializers.ListField()
    statuses = serializers.ListField()
