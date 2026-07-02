from rest_framework import serializers
from django.utils import timezone

from apps.rooms.serializers import PublicRoomListSerializer
from apps.viewing_requests.models import ViewingRequest
from apps.viewing_requests.services import ViewingRequestService


class ViewingRequestCreateSerializer(serializers.Serializer):
    room_id = serializers.IntegerField()
    preferred_viewing_date = serializers.DateField(required=True)
    preferred_viewing_time_slot = serializers.ChoiceField(
        choices=ViewingRequest.TimeSlot.choices,
        required=True,
    )

    def validate_preferred_viewing_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Viewing date cannot be in the past.")
        return value

    def create(self, validated_data):
        return ViewingRequestService.create_viewing_request(
            user=self.context["request"].user,
            room_id=validated_data["room_id"],
            preferred_viewing_date=validated_data.get("preferred_viewing_date"),
            preferred_viewing_time_slot=validated_data.get("preferred_viewing_time_slot", ""),
        )


class ViewingRequestCreateResponseSerializer(serializers.ModelSerializer):
    appointment_confirmed_at = serializers.DateTimeField(source="confirmed_at", read_only=True)
    room_id = serializers.IntegerField(source="room.id", read_only=True)

    class Meta:
        model = ViewingRequest
        fields = (
            "id",
            "room_id",
            "status",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "created_at",
            "appointment_confirmed_at",
        )
        read_only_fields = fields


class MyViewingRequestSerializer(serializers.ModelSerializer):
    appointment_confirmed_at = serializers.DateTimeField(source="confirmed_at", read_only=True)
    room = PublicRoomListSerializer(read_only=True)

    class Meta:
        model = ViewingRequest
        fields = (
            "id",
            "room",
            "status",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "created_at",
            "appointment_confirmed_at",
            "updated_at",
        )
        read_only_fields = fields


class AdminViewingRequestSerializer(serializers.ModelSerializer):
    appointment_confirmed_at = serializers.DateTimeField(source="confirmed_at", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True)
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
            "assigned_to",
            "assigned_to_name",
            "next_follow_up_at",
            "appointment_confirmed_at",
            "appointment_date",
            "appointment_time_slot",
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
            "appointment_confirmed_at",
            "appointment_date",
            "appointment_time_slot",
            "moved_in_at",
            "is_commission_counted",
            "estimated_commission_amount",
            "actual_commission_amount",
            "created_at",
            "updated_at",
        )

    def validate_status(self, value):
        if self.instance and value == ViewingRequest.Status.MOVED_IN and self.instance.status != ViewingRequest.Status.MOVED_IN:
            raise serializers.ValidationError("Use confirm moved-in action to record commission.")
        if self.instance and self.instance.status == ViewingRequest.Status.MOVED_IN and value != ViewingRequest.Status.MOVED_IN:
            raise serializers.ValidationError("Moved-in leads cannot be changed to another status.")
        return value

    def update(self, instance, validated_data):
        updated = super().update(instance, validated_data)
        if validated_data:
            from apps.viewing_requests.models import ViewingRequestActivity

            ViewingRequestActivity.objects.create(
                viewing_request=updated,
                actor=self.context["request"].user,
                action="UPDATE",
                note=validated_data.get("saler_note", ""),
            )
        return updated


class ConfirmMovedInResponseSerializer(serializers.Serializer):
    viewing_request_id = serializers.IntegerField()
    actual_commission_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    status = serializers.CharField()


class AppointmentConfirmSerializer(serializers.Serializer):
    appointment_date = serializers.DateField(required=True)
    appointment_time_slot = serializers.ChoiceField(choices=ViewingRequest.TimeSlot.choices, required=True)
    note = serializers.CharField(required=False, allow_blank=True)

    def validate_appointment_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("Appointment date cannot be in the past.")
        return value


class MoveOutSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)


class BulkViewingRequestUpdateSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    status = serializers.ChoiceField(choices=[choice for choice in ViewingRequest.Status.choices if choice[0] != ViewingRequest.Status.MOVED_IN], required=False)
    assigned_to = serializers.IntegerField(required=False, allow_null=True)
    next_follow_up_at = serializers.DateTimeField(required=False, allow_null=True)
    saler_note = serializers.CharField(required=False, allow_blank=True)
