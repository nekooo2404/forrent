"use client";

import { useMemo, useState } from "react";

import { Search, X } from "@/components/ui/icons";
import type { ApiAmenity } from "@/lib/api";

const DEFAULT_VISIBLE_COUNT = 8;

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .replace(/đ/g, "d")
    .trim();
}

export function AmenityFilter({
  activeAmenityIds,
  amenities,
}: Readonly<{
  activeAmenityIds: string[];
  amenities: ApiAmenity[];
}>) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(activeAmenityIds));
  const normalizedQuery = normalizeSearchValue(query);

  const selectedAmenities = useMemo(
    () => amenities.filter((amenity) => selectedIds.has(String(amenity.id))),
    [amenities, selectedIds],
  );
  const matchingAmenities = useMemo(
    () => amenities.filter((amenity) => normalizeSearchValue(amenity.name).includes(normalizedQuery)),
    [amenities, normalizedQuery],
  );
  const matchingUnselectedAmenities = matchingAmenities.filter(
    (amenity) => !selectedIds.has(String(amenity.id)),
  );
  const remainingDefaultSlots = Math.max(0, DEFAULT_VISIBLE_COUNT - selectedAmenities.length);
  const visibleUnselectedAmenities = normalizedQuery || expanded
    ? matchingUnselectedAmenities
    : matchingUnselectedAmenities.slice(0, remainingDefaultSlots);
  const visibleCount = selectedAmenities.length + visibleUnselectedAmenities.length;
  const canToggleAll = !normalizedQuery && amenities.length > DEFAULT_VISIBLE_COUNT;

  const updateSelection = (amenityId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(amenityId);
      else next.delete(amenityId);
      return next;
    });
  };

  const renderAmenity = (amenity: ApiAmenity) => {
    const amenityId = String(amenity.id);
    return (
      <label
        className="group flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-container"
        key={amenity.id}
      >
        <input
          checked={selectedIds.has(amenityId)}
          className="size-4 rounded border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
          name="amenities"
          onChange={(event) => updateSelection(amenityId, event.currentTarget.checked)}
          type="checkbox"
          value={amenity.id}
        />
        <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-on-surface">
          {amenity.name}
        </span>
      </label>
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          size={17}
          strokeWidth={1.8}
        />
        <input
          aria-label="Tìm tiện ích"
          className="min-h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-lowest py-2 pl-10 pr-10 font-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Tìm điều hòa, thang máy..."
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Xóa tìm kiếm tiện ích"
            className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            onClick={() => setQuery("")}
            type="button"
          >
            <X aria-hidden="true" size={17} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

      <p aria-live="polite" className="font-body-sm text-body-sm text-on-surface-variant">
        {normalizedQuery
          ? `Tìm thấy ${matchingAmenities.length}/${amenities.length} tiện ích`
          : `Hiển thị ${visibleCount}/${amenities.length} tiện ích`}
      </p>

      <div
        aria-label="Danh sách tiện ích"
        className="max-h-72 space-y-2 overflow-y-auto overscroll-contain rounded-md border border-outline-variant/30 bg-surface-container-lowest p-1 pr-2"
        role="group"
      >
        {selectedAmenities.length ? (
          <div>
            <p className="px-2 pb-1 pt-2 font-label-caps text-label-caps text-primary">
              Đã chọn ({selectedAmenities.length})
            </p>
            <div className="space-y-1">{selectedAmenities.map(renderAmenity)}</div>
          </div>
        ) : null}

        {visibleUnselectedAmenities.length ? (
          <div className="space-y-1">{visibleUnselectedAmenities.map(renderAmenity)}</div>
        ) : null}

        {!selectedAmenities.length && !visibleUnselectedAmenities.length ? (
          <p className="px-2 py-4 text-center font-body-sm text-body-sm text-on-surface-variant">
            Không tìm thấy tiện ích phù hợp.
          </p>
        ) : null}
      </div>

      {canToggleAll ? (
        <button
          className="flex min-h-11 w-full items-center justify-center rounded-md px-3 font-button text-button text-secondary underline underline-offset-4 transition-colors hover:bg-surface-container hover:text-primary"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Thu gọn tiện ích" : "Xem tất cả tiện ích"}
        </button>
      ) : null}
    </div>
  );
}
