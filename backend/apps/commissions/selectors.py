from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth

from apps.commissions.models import CommissionPayout
from apps.rooms.models import Room
from apps.viewing_requests.models import ViewingRequest


def commission_summary():
    total_received = ViewingRequest.objects.filter(is_commission_counted=True).aggregate(
        total=Sum("actual_commission_amount")
    )["total"] or 0
    total_estimated = ViewingRequest.objects.exclude(status__in=[
        ViewingRequest.Status.CANCELLED,
        ViewingRequest.Status.NO_SHOW,
    ]).aggregate(total=Sum("estimated_commission_amount"))["total"] or 0
    total_moved_in = ViewingRequest.objects.filter(status=ViewingRequest.Status.CONVERTED).count()
    total_pending = ViewingRequest.objects.filter(status__in=ViewingRequest.ACTIVE_STATUSES).count()
    payout_totals = CommissionPayout.objects.aggregate(
        pending=Sum("amount", filter=Q(status=CommissionPayout.Status.PENDING)),
        approved=Sum("amount", filter=Q(status=CommissionPayout.Status.APPROVED)),
        paid=Sum("amount", filter=Q(status=CommissionPayout.Status.PAID)),
    )
    by_room = (
        ViewingRequest.objects.values("room_id", "room__title")
        .annotate(
            total_estimated_commission=Sum("estimated_commission_amount"),
            total_received_commission=Sum("actual_commission_amount"),
            lead_count=Count("id"),
            moved_in_count=Count("id", filter=Q(status=ViewingRequest.Status.CONVERTED)),
        )
        .order_by("room__title")
    )
    by_month = (
        ViewingRequest.objects.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(
            total_estimated_commission=Sum("estimated_commission_amount"),
            total_received_commission=Sum("actual_commission_amount"),
            lead_count=Count("id"),
        )
        .order_by("month")
    )
    return {
        "total_received_commission": total_received,
        "total_estimated_commission": total_estimated,
        "total_pending_payout": payout_totals["pending"] or 0,
        "total_approved_payout": payout_totals["approved"] or 0,
        "total_paid_payout": payout_totals["paid"] or 0,
        "total_moved_in_leads": total_moved_in,
        "total_pending_leads": total_pending,
        "by_room": list(by_room),
        "by_month": list(by_month),
    }


def dashboard_summary():
    latest_leads = (
        ViewingRequest.objects.select_related("room")
        .order_by("-created_at")[:5]
    )
    status_counts = {
        item["status"]: item["count"]
        for item in ViewingRequest.objects.values("status").annotate(count=Count("id"))
    }
    return {
        "total_rooms": Room.objects.count(),
        "active_rooms": Room.objects.filter(status=Room.Status.PUBLISHED).count(),
        "total_viewing_requests": ViewingRequest.objects.count(),
        "total_new_leads": ViewingRequest.objects.filter(status=ViewingRequest.Status.NEW).count(),
        "total_moved_in_leads": ViewingRequest.objects.filter(status=ViewingRequest.Status.CONVERTED).count(),
        "total_estimated_commission": ViewingRequest.objects.aggregate(total=Sum("estimated_commission_amount"))["total"] or 0,
        "total_received_commission": ViewingRequest.objects.filter(is_commission_counted=True).aggregate(total=Sum("actual_commission_amount"))["total"] or 0,
        "status_counts": status_counts,
        "latest_leads": [
            {
                "id": lead.id,
                "full_name": lead.full_name,
                "phone": lead.phone,
                "room_id": lead.room_id,
                "room_title": lead.room.title,
                "status": lead.status,
                "created_at": lead.created_at,
            }
            for lead in latest_leads
        ],
    }
