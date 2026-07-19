"use client";

import { ChevronDown, Plus, X } from "@/components/ui/icons";
import { useEffect, useState, type ReactNode } from "react";

import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { ApiRoomSubtype } from "@/lib/api";

export function ResponsiveFilter({ children }: Readonly<{ children: ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false);
  const sheetRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("filter-sheet-open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("filter-sheet-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="responsive-filter">
      <button
        aria-controls="room-filter-content"
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 font-semibold text-primary lg:hidden"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        Lọc phòng
        <Plus aria-hidden="true" className={isOpen ? "rotate-45" : ""} size={20} strokeWidth={1.8} />
      </button>
      <div className={`${isOpen ? "fixed" : "hidden"} inset-0 z-[120] lg:static lg:block lg:z-auto`} id="room-filter-content">
        <button aria-label="Đóng bộ lọc" className="absolute inset-0 bg-on-surface/45 lg:hidden" onClick={() => setIsOpen(false)} type="button" />
        <div
          aria-labelledby={isOpen ? "room-filter-title" : undefined}
          aria-modal={isOpen ? "true" : undefined}
          className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-lg bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] shadow-elevated lg:static lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:pb-0 lg:shadow-none"
          ref={sheetRef}
          role={isOpen ? "dialog" : undefined}
        >
          <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-outline-variant/60 bg-surface-container-lowest px-4 lg:hidden">
            <h2 className="text-lg font-semibold text-on-surface" id="room-filter-title">Lọc phòng</h2>
            <button aria-label="Đóng bộ lọc" className="inline-flex size-11 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low" onClick={() => setIsOpen(false)} type="button">
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function RoomTypeSubtypeFilter({
  initialRoomSubtype,
  initialRoomType,
  roomSubtypes,
  roomTypes,
}: Readonly<{
  initialRoomSubtype?: string;
  initialRoomType?: string;
  roomSubtypes: ApiRoomSubtype[];
  roomTypes: Array<{ value: string; label: string }>;
}>) {
  const [roomType, setRoomType] = useState(initialRoomType ?? "");
  const [roomSubtype, setRoomSubtype] = useState(initialRoomSubtype ?? "");
  const visibleSubtypes = roomSubtypes.filter((item) => item.parent_type === roomType);

  return (
    <>
      <div className="border-b border-outline-variant/20 py-3">
        <label className="mb-2 block font-button text-button text-on-surface" htmlFor="room-type-filter">Loại phòng</label>
        <div className="relative">
          <select
            className="min-h-11 w-full appearance-none rounded-md border border-outline-variant/60 bg-surface-container-low px-3 py-3 pr-10 font-body-md text-on-surface focus:border-primary focus:ring-primary"
            id="room-type-filter"
            name="room_type"
            onChange={(event) => {
              setRoomType(event.target.value);
              setRoomSubtype("");
            }}
            value={roomType}
          >
            <option value="">Tất cả loại phòng</option>
            {roomTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary" size={18} strokeWidth={1.8} />
        </div>
      </div>
      {visibleSubtypes.length ? (
        <div className="border-b border-outline-variant/20 py-3">
          <label className="mb-2 block font-button text-button text-on-surface" htmlFor="room-subtype-filter">Kiểu phòng</label>
          <select
            className="min-h-11 w-full rounded-md border border-outline-variant/60 bg-surface-container-low px-3 py-3 font-body-md text-on-surface focus:border-primary focus:ring-primary"
            id="room-subtype-filter"
            name="room_subtype"
            onChange={(event) => setRoomSubtype(event.target.value)}
            value={roomSubtype}
          >
            <option value="">Tất cả kiểu phòng</option>
            {visibleSubtypes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      ) : null}
    </>
  );
}
