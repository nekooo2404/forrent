from decimal import Decimal

from django.contrib.auth import get_user_model

from apps.locations.models import Amenity, AreaRange, City, Ward
from apps.rooms.models import Room

User = get_user_model()


def create_user(email="tenant@example.com", phone="0911111111", role=None, password="Password@123"):
    role = role or User.Role.TENANT
    return User.objects.create_user(
        email=email,
        phone=phone,
        password=password,
        full_name="Test User",
        role=role,
        is_staff=role == User.Role.ADMIN,
        is_superuser=role == User.Role.ADMIN,
    )


def create_admin(email="admin@example.com", phone="0900000000"):
    return create_user(email=email, phone=phone, role=User.Role.ADMIN)


def create_location_graph():
    city = City.objects.create(name="Ha Noi", slug="ha-noi")
    ward = Ward.objects.create(city=city, name="Cau Giay", slug="cau-giay")
    amenity = Amenity.objects.create(name="Wifi", icon="wifi")
    area_range = AreaRange.objects.create(name="20-30m2", min_area=Decimal("20"), max_area=Decimal("30"))
    return city, ward, amenity, area_range


def create_room(created_by=None, status=Room.Status.AVAILABLE):
    created_by = created_by or create_admin()
    city, ward, amenity, area_range = create_location_graph()
    room = Room.objects.create(
        title="Phong dep Cau Giay",
        room_type=Room.RoomType.CCMN,
        city=city,
        ward=ward,
        address="So 1 Cau Giay",
        price=Decimal("5000000"),
        actual_area=Decimal("25"),
        area_range=area_range,
        short_description="Phong dep",
        description="Phong day du tien ich",
        status=status,
        commission_percent=Decimal("50"),
        commission_base_amount=Decimal("5000000"),
        internal_note="Sensitive admin note",
        created_by=created_by,
    )
    room.amenities.add(amenity)
    return room
