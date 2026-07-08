from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.blogs.models import Blog
from apps.locations.models import Amenity, AreaRange, City, Ward
from apps.rooms.models import Room

User = get_user_model()


class Command(BaseCommand):
    help = "Seed initial data for local development."

    def handle(self, *args, **options):
        admin, _ = User.objects.get_or_create(
            email="admin@example.com",
            defaults={
                "phone": "0900000000",
                "full_name": "Default Admin",
                "role": User.Role.SALER,
                "is_staff": True,
                "is_superuser": False,
            },
        )
        admin.phone = "0900000000"
        admin.full_name = "Default Admin"
        admin.role = User.Role.SALER
        admin.is_staff = True
        admin.is_superuser = False
        admin.set_password("Admin@123")
        admin.save()

        hanoi, _ = City.objects.get_or_create(name="Ha Noi", defaults={"slug": "ha-noi"})
        hcm, _ = City.objects.get_or_create(name="Ho Chi Minh", defaults={"slug": "ho-chi-minh"})

        cau_giay, _ = Ward.objects.get_or_create(city=hanoi, name="Cau Giay", defaults={"slug": "cau-giay"})
        dong_da, _ = Ward.objects.get_or_create(city=hanoi, name="Dong Da", defaults={"slug": "dong-da"})
        binh_thanh, _ = Ward.objects.get_or_create(city=hcm, name="Binh Thanh", defaults={"slug": "binh-thanh"})

        amenities = []
        for name, icon in [
            ("Wifi", "wifi"),
            ("Dieu hoa", "air-vent"),
            ("May giat", "washing-machine"),
            ("Cho de xe", "parking-circle"),
            ("Ban cong", "building"),
        ]:
            amenity, _ = Amenity.objects.get_or_create(name=name, defaults={"icon": icon})
            amenities.append(amenity)

        range_20_30, _ = AreaRange.objects.get_or_create(
            name="20-30m2",
            defaults={"min_area": Decimal("20"), "max_area": Decimal("30")},
        )
        range_30_50, _ = AreaRange.objects.get_or_create(
            name="30-50m2",
            defaults={"min_area": Decimal("30"), "max_area": Decimal("50")},
        )
        above_50, _ = AreaRange.objects.get_or_create(
            name="Tren 50m2",
            defaults={"min_area": Decimal("50"), "max_area": None},
        )

        rooms = [
            {
                "title": "CCMN Cau Giay gan dai hoc",
                "room_type": Room.RoomType.CCMN,
                "city": hanoi,
                "ward": cau_giay,
                "address": "So 12 Ngo 68 Cau Giay",
                "price": Decimal("4500000"),
                "actual_area": Decimal("25"),
                "area_range": range_20_30,
                "short_description": "Phong sang, du noi that, gan khu van phong.",
                "description": "Phong CCMN tai Cau Giay, thang may, bao ve, gio giac tu do.",
                "commission_percent": Decimal("50"),
                "commission_base_amount": Decimal("4500000"),
                "internal_note": "Uu tien khach vao o trong thang.",
            },
            {
                "title": "Can ho dich vu Dong Da full noi that",
                "room_type": Room.RoomType.CCDV,
                "city": hanoi,
                "ward": dong_da,
                "address": "Pho Thai Ha, Dong Da",
                "price": Decimal("7000000"),
                "actual_area": Decimal("35"),
                "area_range": range_30_50,
                "short_description": "Can ho dich vu rieng tu, don vao o ngay.",
                "description": "Can ho dich vu co bep rieng, cua so lon, gan trung tam.",
                "commission_percent": Decimal("40"),
                "commission_base_amount": Decimal("7000000"),
                "internal_note": "Chu nha linh hoat gia neu coc nhanh.",
            },
            {
                "title": "Nha nguyen can Binh Thanh",
                "room_type": Room.RoomType.HOUSE,
                "city": hcm,
                "ward": binh_thanh,
                "address": "Duong Bach Dang, Binh Thanh",
                "price": Decimal("18000000"),
                "actual_area": Decimal("65"),
                "area_range": above_50,
                "short_description": "Nha nguyen can phu hop nhom ban hoac gia dinh.",
                "description": "Nha 2 tang, bep rieng, san de xe, khu dan cu yen tinh.",
                "commission_percent": Decimal("30"),
                "commission_base_amount": Decimal("18000000"),
                "internal_note": "Can hop dong toi thieu 1 nam.",
            },
        ]

        for room_data in rooms:
            room, created = Room.objects.get_or_create(
                title=room_data["title"],
                defaults={**room_data, "created_by": admin},
            )
            if created:
                room.amenities.set(amenities[:3])

        Blog.objects.get_or_create(
            title="Kinh nghiem thue phong an toan",
            defaults={
                "short_description": "Nhung diem can kiem tra truoc khi dat coc phong.",
                "content": "Hay kiem tra hop dong, tien ich, chi phi phat sinh va thong tin chu nha truoc khi dat coc.",
                "status": Blog.Status.PUBLISHED,
                "author": admin,
            },
        )
        Blog.objects.get_or_create(
            title="Cach chon phong theo ngan sach",
            defaults={
                "short_description": "Goi y can doi gia thue, vi tri va tien ich.",
                "content": "Nen xac dinh ngan sach tong gom tien phong, dien nuoc, gui xe, internet va chi phi di chuyen.",
                "status": Blog.Status.PUBLISHED,
                "author": admin,
            },
        )

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
