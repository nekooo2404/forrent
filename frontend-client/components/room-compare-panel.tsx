"use client";

import Link from "next/link";
import { BarChart3, X } from "@/components/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";

export type RoomCompareItem = {
  id: string;
  title: string;
  location: string;
  price: string;
  fixedMonthlyCost: string;
  deposit: string;
  area: string;
  primaryMeta: string;
  detailHref: string;
};

const STORAGE_KEY = "forrent.compare.rooms";
const CHANGE_EVENT = "forrent:compare-change";
const MAX_COMPARE_ITEMS = 3;

function sameRoom(left: RoomCompareItem, right: RoomCompareItem) {
  return left.id === right.id;
}

function normalizeSelection(items: RoomCompareItem[], availableItems: RoomCompareItem[]) {
  return items
    .filter((item, index, array) => array.findIndex((candidate) => sameRoom(candidate, item)) === index)
    .filter((item) => availableItems.some((available) => sameRoom(available, item)))
    .slice(0, MAX_COMPARE_ITEMS);
}

function readStoredSelection() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_COMPARE_ITEMS) as RoomCompareItem[];
  } catch {
    return [];
  }
}

function readSelection(availableItems: RoomCompareItem[]) {
  return normalizeSelection(readStoredSelection(), availableItems);
}

function writeSelection(items: RoomCompareItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent<RoomCompareItem[]>(CHANGE_EVENT, { detail: items }));
}

export function RoomCompareToggle({ room }: Readonly<{ room: RoomCompareItem }>) {
  const [selected, setSelected] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const sync = useCallback(() => {
    const allItems = readStoredSelection();
    setSelected(allItems.some((item) => sameRoom(item, room)));
    setLimitReached(!allItems.some((item) => sameRoom(item, room)) && allItems.length >= MAX_COMPARE_ITEMS);
  }, [room]);

  useEffect(() => {
    const updateFromStorage = () => sync();
    sync();
    window.addEventListener(CHANGE_EVENT, updateFromStorage);
    window.addEventListener("storage", updateFromStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, updateFromStorage);
      window.removeEventListener("storage", updateFromStorage);
    };
  }, [sync]);

  function toggle() {
    const current = readStoredSelection();
    const isSelected = current.some((item) => sameRoom(item, room));
    if (isSelected) {
      writeSelection(current.filter((item) => !sameRoom(item, room)));
      return;
    }
    if (current.length >= MAX_COMPARE_ITEMS) {
      setLimitReached(true);
      return;
    }
    writeSelection([...current, room]);
  }

  return (
    <button
      aria-pressed={selected}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant/70 bg-surface-container-lowest text-secondary hover:border-primary hover:text-primary"
      }`}
      data-compare-toggle
      onClick={toggle}
      title={limitReached && !selected ? "Chỉ so sánh tối đa 3 phòng cùng lúc" : undefined}
      type="button"
    >
      <BarChart3 aria-hidden="true" size={17} strokeWidth={1.8} />
      {selected ? "Đang so sánh" : "So sánh"}
    </button>
  );
}

export function RoomCompareBar({ rooms }: Readonly<{ rooms: RoomCompareItem[] }>) {
  const availableItems = useMemo(() => rooms, [rooms]);
  const [selectedRooms, setSelectedRooms] = useState<RoomCompareItem[]>([]);

  useEffect(() => {
    const sync = () => {
      const current = readSelection(availableItems);
      setSelectedRooms(current);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      }
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [availableItems]);

  function removeRoom(room: RoomCompareItem) {
    writeSelection(selectedRooms.filter((item) => !sameRoom(item, room)));
  }

  function clearRooms() {
    writeSelection([]);
  }

  if (availableItems.length < 2) return null;

  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-soft"
      data-compare-panel
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">So sánh nhanh</p>
          <h3 className="mt-1 text-xl font-bold text-on-surface">
            {selectedRooms.length >= 2
              ? `${selectedRooms.length} phòng đang được so sánh`
              : "Chọn 2 phòng để so sánh giá, cọc và diện tích"}
          </h3>
        </div>
        {selectedRooms.length ? (
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-secondary underline underline-offset-4 hover:bg-surface-container-low hover:text-primary"
            data-compare-clear
            onClick={clearRooms}
            type="button"
          >
            Xóa so sánh
          </button>
        ) : null}
      </div>

      {selectedRooms.length >= 2 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {selectedRooms.map((room) => (
            <article className="rounded-md border border-outline-variant/60 bg-surface-container-low p-4" data-compare-card key={room.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="line-clamp-2 text-base font-bold text-on-surface">{room.title}</h4>
                  <p className="mt-1 line-clamp-1 text-sm text-on-surface-variant">{room.location}</p>
                </div>
                <button
                  aria-label={`Bỏ ${room.title} khỏi so sánh`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface-container hover:text-primary"
                  onClick={() => removeRoom(room)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} strokeWidth={1.9} />
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-semibold text-on-surface-variant">Giá thuê</dt>
                  <dd className="mt-1 font-bold tabular-nums text-on-surface">{room.price}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-on-surface-variant">Cố định/tháng</dt>
                  <dd className="mt-1 font-bold tabular-nums text-on-surface">{room.fixedMonthlyCost}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-on-surface-variant">Cọc</dt>
                  <dd className="mt-1 tabular-nums text-on-surface">{room.deposit}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-on-surface-variant">Diện tích</dt>
                  <dd className="mt-1 text-on-surface">{room.area}</dd>
                </div>
              </dl>
              <Link
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-primary/40 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-container"
                href={room.detailHref}
              >
                Xem phòng này
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-on-surface-variant">
          Tính năng này giúp bạn đặt cạnh các khoản chính của tối đa 3 phòng. Dữ liệu chỉ lưu trên trình duyệt hiện tại.
        </p>
      )}
    </section>
  );
}
