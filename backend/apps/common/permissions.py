from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminOrSaler(BasePermission):
    message = "Only SALER/admin users can access this endpoint."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role == user.Role.SALER
        )


class IsAdmin(BasePermission):
    message = "Only SALER/admin users can access this endpoint."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == user.Role.SALER)


class IsTenant(BasePermission):
    message = "Only TENANT users can access this endpoint."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == user.Role.TENANT)


class IsLandlord(BasePermission):
    message = "Only LANDLORD users can access this endpoint."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and user.role == user.Role.LANDLORD
        )


class IsOwner(BasePermission):
    message = "You do not own this resource."

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "user", None) or getattr(obj, "created_by", None)
        return bool(owner and owner == request.user)


class ReadOnlyPublic(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
