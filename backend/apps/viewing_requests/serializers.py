from rest_framework import serializers
from django.utils import timezone

from apps.accounts.models import User
from apps.common.audit import audit_event
from apps.rooms.serializers import PublicRoomListSerializer
from apps.viewing_requests.models import LandlordNotification, ViewingRequest
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


class LandlordNotificationSerializer(serializers.ModelSerializer):
    room_id = serializers.IntegerField(source="viewing_request.room_id", read_only=True)
    room_title = serializers.CharField(source="viewing_request.room.title", read_only=True)
    room_code = serializers.CharField(source="viewing_request.room.room_code", read_only=True)
    requester_name = serializers.CharField(source="viewing_request.full_name", read_only=True)
    preferred_viewing_date = serializers.DateField(
        source="viewing_request.preferred_viewing_date",
        read_only=True,
    )
    preferred_viewing_time_slot = serializers.CharField(
        source="viewing_request.preferred_viewing_time_slot",
        read_only=True,
    )
    is_read = serializers.BooleanField(read_only=True)

    class Meta:
        model = LandlordNotification
        fields = (
            "id",
            "type",
            "viewing_request",
            "room_id",
            "room_title",
            "room_code",
            "requester_name",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "is_read",
            "read_at",
            "created_at",
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
        if not self.instance:
            return value
        if value == ViewingRequest.Status.CONVERTED and self.instance.status != ViewingRequest.Status.CONVERTED:
            raise serializers.ValidationError("Use confirm converted action to record commission.")
        if value == ViewingRequest.Status.SCHEDULED and self.instance.status != ViewingRequest.Status.SCHEDULED:
            raise serializers.ValidationError("Use confirm appointment action to record schedule details.")
        if self.instance.status == ViewingRequest.Status.CONVERTED and value != ViewingRequest.Status.CONVERTED:
            raise serializers.ValidationError("Converted leads cannot be changed to another status.")
        if not ViewingRequest.can_transition(self.instance.status, value):
            raise serializers.ValidationError(f"Cannot change lead from {self.instance.status} to {value}.")
        return value

    def validate_assigned_to(self, value):
        if value and (value.role != User.Role.SALER or not value.is_active):
            raise serializers.ValidationError("Lead can only be assigned to an active SALER account.")
        return value

    def update(self, instance, validated_data):
        previous_status = instance.status
        updated = super().update(instance, validated_data)
        if validated_data:
            from apps.viewing_requests.models import ViewingRequestActivity

            ViewingRequestActivity.objects.create(
                viewing_request=updated,
                actor=self.context["request"].user,
                action="UPDATE",
                note=validated_data.get("saler_note", ""),
            )
            if "status" in validated_data and updated.status != previous_status:
                audit_event(
                    "viewing_request.status_changed",
                    request=self.context.get("request"),
                    target=updated,
                    metadata={"from": previous_status, "to": updated.status},
                )
        return updated


class LandlordViewingRequestSerializer(serializers.ModelSerializer):
    """Owner-safe lead representation and lifecycle updates."""

    appointment_confirmed_at = serializers.DateTimeField(source="confirmed_at", read_only=True)
    room_title = serializers.CharField(source="room.title", read_only=True)
    room_code = serializers.CharField(source="room.room_code", read_only=True)
    city_name = serializers.CharField(source="room.city.name", read_only=True)
    ward_name = serializers.CharField(source="room.ward.name", read_only=True)

    class Meta:
        model = ViewingRequest
        fields = (
            "id",
            "room",
            "room_title",
            "room_code",
            "city_name",
            "ward_name",
            "full_name",
            "phone",
            "email",
            "preferred_viewing_date",
            "preferred_viewing_time_slot",
            "status",
            "appointment_confirmed_at",
            "appointment_date",
            "appointment_time_slot",
            "created_at",
            "updated_at",
        )
        read_only_fields = tuple(field for field in fields if field != "status")

    def validate_status(self, value):
        if not self.instance or value == self.instance.status:
            return value
        if value == ViewingRequest.Status.SCHEDULED:
            raise serializers.ValidationError("Use confirm appointment to record the date and time slot.")
        if value == ViewingRequest.Status.CONVERTED:
            raise serializers.ValidationError("Use the room rental confirmation workflow.")
        if self.instance.status in {ViewingRequest.Status.CONVERTED, ViewingRequest.Status.CANCELLED, ViewingRequest.Status.NO_SHOW}:
            raise serializers.ValidationError("Completed requests cannot be changed.")
        if not ViewingRequest.can_transition(self.instance.status, value):
            raise serializers.ValidationError(f"Cannot change request from {self.instance.status} to {value}.")
        return value

    def update(self, instance, validated_data):
        previous_status = instance.status
        updated = super().update(instance, validated_data)
        if updated.status != previous_status:
            from apps.viewing_requests.models import ViewingRequestActivity

            actor = self.context["request"].user
            ViewingRequestActivity.objects.create(
                viewing_request=updated,
                actor=actor,
                action="LANDLORD_STATUS_UPDATE",
            )
            audit_event(
                "viewing_request.status_changed",
                request=self.context.get("request"),
                target=updated,
                metadata={"from": previous_status, "to": updated.status, "actor_scope": "landlord"},
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
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, max_length=100)
    status = serializers.ChoiceField(
        choices=[
            choice
            for choice in ViewingRequest.Status.choices
            if choice[0] not in {ViewingRequest.Status.SCHEDULED, ViewingRequest.Status.CONVERTED}
        ],
        required=False,
    )
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.SALER, is_active=True),
        required=False,
        allow_null=True,
    )
    next_follow_up_at = serializers.DateTimeField(required=False, allow_null=True)
    saler_note = serializers.CharField(required=False, allow_blank=True)

    def validate_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Lead IDs must be unique.")
        return value
