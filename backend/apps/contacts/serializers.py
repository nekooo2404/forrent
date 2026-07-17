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
        return normalized_phone(value)


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
