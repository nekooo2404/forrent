from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import ActiveQuerySet, TimeStampedModel
from apps.common.utils import unique_slugify


class City(TimeStampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, allow_unicode=True, blank=True)
    is_active = models.BooleanField(default=True)

    objects = ActiveQuerySet.as_manager()

    class Meta:
        verbose_name_plural = "Cities"
        ordering = ("name",)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.name)
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        if self.wards.exists() or self.rooms.exists():
            self.is_active = False
            self.save(update_fields=["is_active", "updated_at"])
            return 1, {self._meta.label: 1}
        return super().delete(using=using, keep_parents=keep_parents)

    def __str__(self):
        return self.name


class Ward(TimeStampedModel):
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="wards")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, allow_unicode=True, blank=True)
    is_active = models.BooleanField(default=True)

    objects = ActiveQuerySet.as_manager()

    class Meta:
        ordering = ("city__name", "name")
        constraints = [
            models.UniqueConstraint(fields=["city", "slug"], name="unique_ward_slug_per_city"),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.name)
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        if self.rooms.exists():
            self.is_active = False
            self.save(update_fields=["is_active", "updated_at"])
            return 1, {self._meta.label: 1}
        return super().delete(using=using, keep_parents=keep_parents)

    def __str__(self):
        return f"{self.name}, {self.city.name}"


class Amenity(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    icon = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    objects = ActiveQuerySet.as_manager()

    class Meta:
        verbose_name_plural = "Amenities"
        ordering = ("name",)

    def __str__(self):
        return self.name


class AreaRange(TimeStampedModel):
    name = models.CharField(max_length=255, unique=True)
    min_area = models.DecimalField(max_digits=8, decimal_places=2)
    max_area = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    objects = ActiveQuerySet.as_manager()

    class Meta:
        ordering = ("min_area",)

    def clean(self):
        if self.max_area is not None and self.min_area > self.max_area:
            raise ValidationError({"max_area": "max_area must be greater than or equal to min_area."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
