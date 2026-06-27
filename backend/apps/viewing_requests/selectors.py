from apps.viewing_requests.models import ViewingRequest


def admin_viewing_requests_queryset():
    return ViewingRequest.objects.select_related(
        "user",
        "room",
        "room__city",
        "room__ward",
    )


def user_viewing_requests_queryset(user):
    return admin_viewing_requests_queryset().filter(user=user)
