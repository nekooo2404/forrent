"use client";

import { Plus } from "lucide-react";
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
        <h3 className="mb-2 font-button text-button text-on-surface">Loại hình</h3>
        <div className="space-y-1">
          {[{ value: "", label: "Tất cả loại phòng" }, ...roomTypes].map((item) => (
            <label className="group flex min-h-11 cursor-pointer items-center gap-3 py-2" key={item.value || "all"}>
              <input
                checked={roomType === item.value}
                className="size-4 border-outline-variant bg-surface-container-lowest text-primary focus:ring-primary"
                name="room_type"
                onChange={() => {
                  setRoomType(item.value);
                  setRoomSubtype("");
                }}
                type="radio"
                value={item.value}
              />
              <span className="font-body-md text-body-md text-on-surface-variant transition-colors group-hover:text-on-surface">
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      {visibleSubtypes.length ? (
        <div className="border-b border-outline-variant/20 py-3">
          <label className="mb-2 block font-button text-button text-on-surface" htmlFor="room-subtype-filter">Kiểu phòng</label>
          <select
            className="min-h-11 w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-3 py-3 font-body-md text-on-surface focus:border-primary focus:ring-primary"
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
