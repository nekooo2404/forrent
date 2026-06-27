from rest_framework import serializers

from apps.rooms.serializers import PublicRoomListSerializer
from apps.viewing_requests.models import ViewingRequest
from apps.viewing_requests.services import ViewingRequestService


class ViewingRequestCreateSerializer(serializers.Serializer):
    room_id = serializers.IntegerField()
    preferred_viewing_date = serializers.DateField(required=False, allow_null=True)
    preferred_viewing_time_slot = serializers.ChoiceField(
        choices=ViewingRequest.TimeSlot.choices,
        required=False,
        allow_blank=True,
    )

    def create(self, validated_data):
        return ViewingRequestService.create_viewing_request(
            user=self.context["request"].user,
            room_id=validated_data["room_id"],
            preferred_viewing_date=validated_data.get("preferred_viewing_date"),
            preferred_viewing_time_slot=validated_data.get("preferred_viewing_time_slot", ""),
        )


class ViewingRequestCreateResponseSerializer(serializers.ModelSerializer):
    room_id = serializers.IntegerField(source="room.id", read_only=True)

    class Meta:
        model = ViewingRequest
        fields = ("id", "room_id", "status", "preferred_viewing_date", "preferred_viewing_time_slot", "confirmed_at")
        read_only_fields = fields


class MyViewingRequestSerializer(serializers.ModelSerializer):
    room = PublicRoomListSerializer(read_only=True)

    class Meta:
        model = ViewingRequest
        fields = (
            "id",
            "room",
            "status",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "confirmed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AdminViewingRequestSerializer(serializers.ModelSerializer):
    room_title = serializers.CharField(source="room.title", read_only=True)
    city_name = serializers.CharField(source="room.city.name", read_only=True)
    ward_name = serializers.CharField(source="room.ward.name", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = ViewingRequest
        fields = (
            "id",
            "user_id",
            "room",
            "room_title",
            "city_name",
            "ward_name",
            "full_name",
            "date_of_birth",
            "phone",
            "email",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "status",
            "saler_note",
            "confirmed_at",
            "moved_in_at",
            "is_commission_counted",
            "estimated_commission_amount",
            "actual_commission_amount",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user_id",
            "room",
            "room_title",
            "city_name",
            "ward_name",
            "full_name",
            "date_of_birth",
            "phone",
            "email",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "confirmed_at",
            "moved_in_at",
            "is_commission_counted",
            "estimated_commission_amount",
            "actual_commission_amount",
            "created_at",
            "updated_at",
        )

    def validate_status(self, value):
        if self.instance and self.instance.status == ViewingRequest.Status.MOVED_IN and value != ViewingRequest.Status.MOVED_IN:
            raise serializers.ValidationError("Moved-in leads cannot be changed to another status.")
        return value


class ConfirmMovedInResponseSerializer(serializers.Serializer):
    viewing_request_id = serializers.IntegerField()
    actual_commission_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    status = serializers.CharField()
