from django.db import migrations
from django.utils.text import slugify


HANOI_WARD_NAMES = (
    "Hoàn Kiếm",
    "Cửa Nam",
    "Ba Đình",
    "Ngọc Hà",
    "Giảng Võ",
    "Hai Bà Trưng",
    "Vĩnh Tuy",
    "Bạch Mai",
    "Đống Đa",
    "Kim Liên",
    "Văn Miếu - Quốc Tử Giám",
    "Láng",
    "Ô Chợ Dừa",
    "Hồng Hà",
    "Lĩnh Nam",
    "Hoàng Mai",
    "Vĩnh Hưng",
    "Tương Mai",
    "Định Công",
    "Hoàng Liệt",
    "Yên Sở",
    "Thanh Xuân",
    "Khương Đình",
    "Phương Liệt",
    "Cầu Giấy",
    "Nghĩa Đô",
    "Yên Hòa",
    "Tây Hồ",
    "Phú Thượng",
    "Tây Tựu",
    "Phú Diễn",
    "Xuân Đỉnh",
    "Đông Ngạc",
    "Thượng Cát",
    "Từ Liêm",
    "Xuân Phương",
    "Tây Mỗ",
    "Đại Mỗ",
    "Long Biên",
    "Bồ Đề",
    "Việt Hưng",
    "Phúc Lợi",
    "Hà Đông",
    "Dương Nội",
    "Yên Nghĩa",
    "Phú Lương",
    "Kiến Hưng",
    "Thanh Liệt",
    "Chương Mỹ",
    "Sơn Tây",
    "Tùng Thiện",
)


def ward_slug(name):
    return slugify(name.replace("Đ", "D").replace("đ", "d"))


def seed_hanoi_wards(apps, schema_editor):
    City = apps.get_model("locations", "City")
    Ward = apps.get_model("locations", "Ward")

    hanoi = City.objects.filter(slug="ha-noi").first()
    if hanoi is None:
        hanoi = City.objects.filter(name__in=("Hà Nội", "Ha Noi", "Hanoi")).first()
    if hanoi is None:
        hanoi = City.objects.create(name="Hà Nội", slug="ha-noi", is_active=True)
    else:
        hanoi.name = "Hà Nội"
        hanoi.slug = "ha-noi"
        hanoi.is_active = True
        hanoi.save(update_fields=("name", "slug", "is_active"))

    for name in HANOI_WARD_NAMES:
        slug = ward_slug(name)
        ward = Ward.objects.filter(city_id=hanoi.pk, slug=slug).first()
        if ward is None:
            ward = Ward.objects.filter(city_id=hanoi.pk, name=name).first()
        if ward is None:
            Ward.objects.create(city_id=hanoi.pk, name=name, slug=slug, is_active=True)
            continue

        ward.name = name
        ward.slug = slug
        ward.is_active = True
        ward.save(update_fields=("name", "slug", "is_active"))


class Migration(migrations.Migration):
    dependencies = [
        ("locations", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_hanoi_wards, migrations.RunPython.noop),
    ]
