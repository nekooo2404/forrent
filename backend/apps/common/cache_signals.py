from functools import partial

from django.db import transaction
from django.db.models.signals import m2m_changed, post_delete, post_save

from apps.blogs.models import Blog
from apps.common.cache_utils import (
    BLOG_DETAIL_CACHE_NAMESPACE,
    BLOG_LIST_CACHE_NAMESPACE,
    ROOM_DETAIL_CACHE_NAMESPACE,
    ROOM_FILTER_CACHE_NAMESPACE,
    ROOM_LIST_CACHE_NAMESPACE,
    invalidate_cache_namespaces,
)
from apps.locations.models import Amenity, AreaRange, City, Ward
from apps.rooms.models import DepositType, Room, RoomImage, RoomSubtype


ROOM_CONTENT_NAMESPACES = (ROOM_LIST_CACHE_NAMESPACE, ROOM_DETAIL_CACHE_NAMESPACE)
ROOM_LOOKUP_NAMESPACES = (*ROOM_CONTENT_NAMESPACES, ROOM_FILTER_CACHE_NAMESPACE)
BLOG_NAMESPACES = (BLOG_LIST_CACHE_NAMESPACE, BLOG_DETAIL_CACHE_NAMESPACE)


def _invalidate_after_commit(namespaces, **_kwargs):
    transaction.on_commit(partial(invalidate_cache_namespaces, *namespaces))


def _invalidate_m2m_after_commit(namespaces, *, action, **_kwargs):
    if action in {"post_add", "post_remove", "post_clear"}:
        transaction.on_commit(partial(invalidate_cache_namespaces, *namespaces))


def _connect_model_signals():
    for model in (Room, RoomImage):
        post_save.connect(
            partial(_invalidate_after_commit, ROOM_CONTENT_NAMESPACES),
            sender=model,
            weak=False,
            dispatch_uid=f"public-cache-room-save-{model._meta.label_lower}",
        )
        post_delete.connect(
            partial(_invalidate_after_commit, ROOM_CONTENT_NAMESPACES),
            sender=model,
            weak=False,
            dispatch_uid=f"public-cache-room-delete-{model._meta.label_lower}",
        )

    for model in (City, Ward, Amenity, AreaRange, DepositType, RoomSubtype):
        post_save.connect(
            partial(_invalidate_after_commit, ROOM_LOOKUP_NAMESPACES),
            sender=model,
            weak=False,
            dispatch_uid=f"public-cache-lookup-save-{model._meta.label_lower}",
        )
        post_delete.connect(
            partial(_invalidate_after_commit, ROOM_LOOKUP_NAMESPACES),
            sender=model,
            weak=False,
            dispatch_uid=f"public-cache-lookup-delete-{model._meta.label_lower}",
        )

    for signal, action in ((post_save, "save"), (post_delete, "delete")):
        signal.connect(
            partial(_invalidate_after_commit, BLOG_NAMESPACES),
            sender=Blog,
            weak=False,
            dispatch_uid=f"public-cache-blog-{action}",
        )

    m2m_changed.connect(
        partial(_invalidate_m2m_after_commit, ROOM_CONTENT_NAMESPACES),
        sender=Room.amenities.through,
        weak=False,
        dispatch_uid="public-cache-room-amenities-changed",
    )


_connect_model_signals()
