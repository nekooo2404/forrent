"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { ApiRoomSubtype } from "@/lib/api";

export function ResponsiveFilter({ children }: Readonly<{ children: ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="responsive-filter">
      <button
        aria-controls="room-filter-content"
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 font-semibold text-primary lg:hidden"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        Bộ lọc phòng
        <Plus aria-hidden="true" className={isOpen ? "rotate-45" : ""} size={20} strokeWidth={1.8} />
      </button>
      <div className={`${isOpen ? "block" : "hidden"} lg:block`} id="room-filter-content">
        {children}
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
