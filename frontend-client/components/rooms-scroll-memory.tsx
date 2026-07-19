"use client";

import { useEffect } from "react";

const STORAGE_KEY = "forrent:rooms-scroll";
const MAX_AGE_MS = 30 * 60 * 1000;

type StoredScroll = {
  key: string;
  roomId: string;
  savedAt: number;
  scrollY: number;
};

export function RoomsScrollMemory() {
  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const pageKey = `${window.location.pathname}${window.location.search}`;

    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) as StoredScroll : null;
      if (saved && saved.key === pageKey && Date.now() - saved.savedAt < MAX_AGE_MS) {
        const restore = () => {
          const roomCard = document.querySelector<HTMLElement>(`[data-room-card-id="${CSS.escape(saved.roomId)}"]`);
          if (roomCard) {
            window.scrollTo({ top: saved.scrollY, behavior: "auto" });
          }
        };
        requestAnimationFrame(() => requestAnimationFrame(restore));
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }

    const remember = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-room-detail-link]") : null;
      if (!target) return;
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          key: pageKey,
          roomId: target.dataset.roomId ?? "",
          savedAt: Date.now(),
          scrollY: window.scrollY,
        } satisfies StoredScroll),
      );
    };

    document.addEventListener("click", remember, true);
    return () => {
      document.removeEventListener("click", remember, true);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return null;
}
