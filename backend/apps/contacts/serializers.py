from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.common.validators import normalize_vietnamese_phone, validate_vietnamese_phone
from apps.contacts.models import ContactMessage
from apps.rooms.models import Room


def normalized_phone(value):
    try:
        validate_vietnamese_phone(value)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages) from exc
    return normalize_vietnamese_phone(value)


class ContactCreateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True)
    room_id = serializers.PrimaryKeyRelatedField(
        source="room",
        queryset=Room.objects.available(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = ContactMessage
        fields = ("full_name", "phone", "email", "message", "room_id")

    def validate_phone(self, value):
        return normalized_phone(value) if value else ""

    def validate(self, attrs):
        if not attrs.get("phone") and not attrs.get("email"):
            raise serializers.ValidationError(
                {"contact": "Vui l\u00f2ng nh\u1eadp s\u1ed1 \u0111i\u1ec7n tho\u1ea1i ho\u1eb7c email \u0111\u1ec3 nh\u00e2n vi\u00ean t\u01b0 v\u1ea5n li\u00ean h\u1ec7."}
            )
        return attrs


class AdminContactMessageSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True)
    converted_viewing_request_id = serializers.IntegerField(source="converted_viewing_request.id", read_only=True)
    room_title = serializers.CharField(source="room.title", read_only=True)

    class Meta:
        model = ContactMessage
        fields = (
            "id",
            "full_name",
            "phone",
            "email",
            "message",
            "status",
            "room",
            "room_title",
            "assigned_to",
            "assigned_to_name",
            "admin_note",
            "converted_viewing_request_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "room_title", "assigned_to_name", "converted_viewing_request_id", "created_at", "updated_at")

    def validate_phone(self, value):
        return normalized_phone(value)


class BulkContactUpdateSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, max_length=100)
    status = serializers.ChoiceField(choices=ContactMessage.Status.choices)

    def validate_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Contact IDs must be unique.")
        return value


class ContactConvertResponseSerializer(serializers.Serializer):
    contact_id = serializers.IntegerField()
    viewing_request_id = serializers.IntegerField()
