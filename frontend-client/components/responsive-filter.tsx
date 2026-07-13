"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

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
