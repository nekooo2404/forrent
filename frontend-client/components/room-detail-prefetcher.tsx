"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoomDetailPrefetcherProps = {
  hrefs: string[];
};

export function RoomDetailPrefetcher({ hrefs }: RoomDetailPrefetcherProps) {
  const router = useRouter();

  useEffect(() => {
    const uniqueHrefs = [...new Set(hrefs)].filter(Boolean);
    if (!uniqueHrefs.length) return;

    let cancelled = false;
    const prefetch = () => {
      if (cancelled) return;
      uniqueHrefs.forEach((href) => router.prefetch(href));
    };

    // Start after hydration so the visible results are ready before detail requests begin.
    prefetch();

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 750 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(prefetch, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [hrefs, router]);

  return null;
}
