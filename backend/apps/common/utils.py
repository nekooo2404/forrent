from decimal import Decimal, ROUND_HALF_UP

from django.utils.text import slugify


def unique_slugify(instance, value, slug_field_name="slug") -> str:
    model = instance.__class__
    base_slug = slugify(value, allow_unicode=True)[:220] or "item"
    slug = base_slug
    index = 1
    queryset = model.objects.all()
    if instance.pk:
        queryset = queryset.exclude(pk=instance.pk)
    while queryset.filter(**{slug_field_name: slug}).exists():
        index += 1
        suffix = f"-{index}"
        slug = f"{base_slug[: 220 - len(suffix)]}{suffix}"
    return slug


def calculate_percent_amount(base_amount, percent):
    base = Decimal(base_amount or 0)
    pct = Decimal(percent or 0)
    amount = base * pct / Decimal("100")
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
