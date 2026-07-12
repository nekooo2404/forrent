from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from apps.common.audit import SENSITIVE_KEYS, audit_admin_action


class StandardResponseReadOnlyMixin:
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "message": "Success", "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "message": "Success", "data": serializer.data})


class StandardResponseUpdateMixin(StandardResponseReadOnlyMixin):
    success_update_message = "Updated successfully."

    def _lock_instance_for_update(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_value = self.kwargs.get(lookup_url_kwarg)
        if lookup_value is None:
            return
        model = self.get_queryset().model
        model._default_manager.select_for_update().only(model._meta.pk.name).filter(
            **{self.lookup_field: lookup_value}
        ).first()

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        self._lock_instance_for_update()
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        changed_fields = [field for field in serializer.validated_data if field not in SENSITIVE_KEYS]
        self.perform_update(serializer)
        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}
        audit_admin_action(request, "resource_updated", serializer.instance, {"fields": changed_fields})
        return Response({"success": True, "message": self.success_update_message, "data": serializer.data})


class StandardResponseModelViewSetMixin(StandardResponseUpdateMixin):
    success_create_message = "Created successfully."
    success_delete_message = "Deleted successfully."

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        audit_admin_action(request, "resource_created", serializer.instance)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {"success": True, "message": self.success_create_message, "data": serializer.data},
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        self._lock_instance_for_update()
        instance = self.get_object()
        self.perform_destroy(instance)
        audit_admin_action(request, "resource_deleted", instance)
        return Response(
            {"success": True, "message": self.success_delete_message, "data": {}},
            status=status.HTTP_200_OK,
        )
