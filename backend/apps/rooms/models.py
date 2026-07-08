from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import ActiveQuerySet, TimeStampedModel
from apps.common.utils import calculate_percent_amount, unique_slugify
from apps.locations.models import Amenity, AreaRange, City, Ward


class RoomQuerySet(models.QuerySet):
    def public(self):
        return self.filter(status=Room.Status.AVAILABLE)

    def available(self):
        return self.filter(status=Room.Status.AVAILABLE)


class DepositType(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)

    objects = ActiveQuerySet.as_manager()

    class Meta:
        ordering = ("name",)

    def delete(self, using=None, keep_parents=False):
        if self.rooms.exists():
            self.is_active = False
            self.save(update_fields=["is_active", "updated_at"])
            return 1, {self._meta.label: 1}
        return super().delete(using=using, keep_parents=keep_parents)

    def __str__(self):
        return self.name


class Room(TimeStampedModel):
    class RoomType(models.TextChoices):
        CCMN = "CCMN", "Chung cu mini"
        CCDV = "CCDV", "Can ho dich vu"
        HOUSE = "HOUSE", "Nha nguyen can"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        UNAVAILABLE = "UNAVAILABLE", "Unavailable"
        HIDDEN = "HIDDEN", "Hidden"

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, allow_unicode=True, blank=True)
    room_type = models.CharField(max_length=20, choices=RoomType.choices)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="rooms")
    ward = models.ForeignKey(Ward, on_delete=models.PROTECT, related_name="rooms")
    address = models.CharField(max_length=500)
    price = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    deposit_type = models.ForeignKey(DepositType, on_delete=models.PROTECT, related_name="rooms", null=True, blank=True)
    deposit_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    electricity_price_per_kwh = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    water_price_per_person = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    service_fee = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    actual_area = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    area_range = models.ForeignKey(AreaRange, on_delete=models.PROTECT, related_name="rooms")
    amenities = models.ManyToManyField(Amenity, related_name="rooms", blank=True)
    short_description = models.TextField(blank=True)
    description = models.TextField()
    thumbnail = models.ImageField(upload_to="room-thumbnails/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    commission_base_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    estimated_commission_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    internal_note = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_rooms")

    objects = RoomQuerySet.as_manager()

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "room_type"]),
            models.Index(fields=["city", "ward"]),
            models.Index(fields=["price"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title)
        self.estimated_commission_amount = calculate_percent_amount(
            self.commission_base_amount,
            self.commission_percent,
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class RoomImage(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="room-images/", null=True, blank=True)
    image_url = models.URLField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("sort_order", "id")

    def __str__(self):
        return f"Image for {self.room}"
