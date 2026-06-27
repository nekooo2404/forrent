from rest_framework import serializers

from apps.contacts.models import ContactMessage


class ContactCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ("full_name", "phone", "email", "message")


class AdminContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ("id", "full_name", "phone", "email", "message", "status", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
