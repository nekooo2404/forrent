from rest_framework import serializers

from apps.locations.models import Amenity, AreaRange, City, Ward


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ("id", "name", "slug", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class WardSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = Ward
        fields = ("id", "city", "city_name", "name", "slug", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ("id", "name", "icon", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class AreaRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreaRange
        fields = ("id", "name", "min_area", "max_area", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
