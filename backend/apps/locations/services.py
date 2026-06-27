from django.db import transaction


class ActiveFlagDeleteMixin:
    @transaction.atomic
    def perform_destroy(self, instance):
        instance.delete()
