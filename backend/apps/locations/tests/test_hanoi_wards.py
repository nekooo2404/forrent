import pytest

from apps.locations.models import City


HANOI_WARD_NAMES = {
    "Ba Đình",
    "Bạch Mai",
    "Bồ Đề",
    "Chương Mỹ",
    "Cầu Giấy",
    "Cửa Nam",
    "Dương Nội",
    "Giảng Võ",
    "Hai Bà Trưng",
    "Hoàn Kiếm",
    "Hoàng Liệt",
    "Hoàng Mai",
    "Hà Đông",
    "Hồng Hà",
    "Khương Đình",
    "Kim Liên",
    "Kiến Hưng",
    "Láng",
    "Lĩnh Nam",
    "Long Biên",
    "Nghĩa Đô",
    "Ngọc Hà",
    "Phương Liệt",
    "Phúc Lợi",
    "Phú Diễn",
    "Phú Lương",
    "Phú Thượng",
    "Sơn Tây",
    "Thanh Liệt",
    "Thanh Xuân",
    "Thượng Cát",
    "Tây Hồ",
    "Tây Mỗ",
    "Tây Tựu",
    "Tương Mai",
    "Tùng Thiện",
    "Từ Liêm",
    "Việt Hưng",
    "Văn Miếu - Quốc Tử Giám",
    "Vĩnh Hưng",
    "Vĩnh Tuy",
    "Xuân Phương",
    "Xuân Đỉnh",
    "Yên Hòa",
    "Yên Nghĩa",
    "Yên Sở",
    "Ô Chợ Dừa",
    "Đại Mỗ",
    "Định Công",
    "Đông Ngạc",
    "Đống Đa",
}


@pytest.mark.django_db
def test_current_hanoi_wards_are_seeded():
    hanoi = City.objects.get(slug="ha-noi")

    assert hanoi.name == "Hà Nội"
    assert hanoi.wards.active().count() == len(HANOI_WARD_NAMES)
    assert set(hanoi.wards.active().values_list("name", flat=True)) == HANOI_WARD_NAMES
    assert hanoi.wards.get(name="Đống Đa").slug == "dong-da"
    assert hanoi.wards.get(name="Đông Ngạc").slug == "dong-ngac"
