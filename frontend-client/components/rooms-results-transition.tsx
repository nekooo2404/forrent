"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";

import { ChevronLeft, ChevronRight, LoaderCircle } from "@/components/ui/icons";

const NAVIGATION_MARKER_KEY = "forrent:rooms-pagination-target";
const NAVIGATION_MARKER_MAX_AGE_MS = 15_000;
const NAVIGATION_RECOVERY_TIMEOUT_MS = 4_000;
const IMAGE_WARMUP_WAIT_MS = 650;
const imageWarmups = new Map<string, Promise<void>>();

type PageLink = {
  href: string;
  page: number;
};

type NavigationMarker = {
  href: string;
  page: number;
  savedAt: number;
};

type RoomsResultsTransitionProps = Readonly<{
  children: ReactNode;
  currentPage: number;
  nextHref?: string;
  pageLinks: PageLink[];
  previousHref: string;
  roomsOnPage: number;
  totalPages: number;
}>;

export function RoomsResultsTransition({
  children,
  currentPage,
  nextHref,
  pageLinks,
  previousHref,
  roomsOnPage,
  totalPages,
}: RoomsResultsTransitionProps) {
  const router = useRouter();
  const resultsRef = useRef<HTMLElement>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const isNavigating = pendingPage !== null;

  useEffect(() => {
    if (nextHref) router.prefetch(nextHref);
  }, [nextHref, router]);

  useEffect(() => {
    let marker: NavigationMarker | null = null;
    try {
      marker = JSON.parse(window.sessionStorage.getItem(NAVIGATION_MARKER_KEY) ?? "null") as NavigationMarker | null;
    } catch {
      window.sessionStorage.removeItem(NAVIGATION_MARKER_KEY);
    }

    const currentHref = `${window.location.pathname}${window.location.search}`;
    const markerIsFresh = Boolean(marker && Date.now() - marker.savedAt < NAVIGATION_MARKER_MAX_AGE_MS);
    const shouldRestore = Boolean(markerIsFresh && marker?.page === currentPage && marker.href === currentHref);
    const wasRedirected = Boolean(
      markerIsFresh
      && marker
      && marker.page !== currentPage
      && new URL(marker.href, window.location.origin).pathname === window.location.pathname,
    );

    if (!shouldRestore && !wasRedirected) return;

    window.sessionStorage.removeItem(NAVIGATION_MARKER_KEY);
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = null;
    setPendingPage(null);
    setAnnouncement(
      wasRedirected
        ? `Trang ${marker?.page} không còn dữ liệu. Đã chuyển đến trang ${currentPage}, hiển thị ${roomsOnPage} phòng.`
        : `Đã tải trang ${currentPage}, hiển thị ${roomsOnPage} phòng.`,
    );

    const frame = window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      document.getElementById("room-results-heading")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentPage, roomsOnPage]);

  useEffect(() => () => {
    if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
  }, []);

  const navigate = (event: MouseEvent<HTMLAnchorElement>, href: string, targetPage: number) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (targetPage === currentPage || isNavigating) return;

    const targetUrl = new URL(href, window.location.origin);
    const targetHref = `${targetUrl.pathname}${targetUrl.search}`;
    try {
      window.sessionStorage.setItem(
        NAVIGATION_MARKER_KEY,
        JSON.stringify({ href: targetHref, page: targetPage, savedAt: Date.now() } satisfies NavigationMarker),
      );
    } catch {
      // Navigation remains functional when storage is unavailable.
    }
    setPendingPage(targetPage);
    setAnnouncement(`Đang tải trang ${targetPage}.`);

    // A distant page can become invalid while the user is browsing.
    // A document navigation lets the server resolve the latest valid page atomically;
    // adjacent pages keep the faster in-app transition and image warmup path.
    if (Math.abs(targetPage - currentPage) > 1) {
      window.location.assign(targetHref);
      return;
    }

    navigationTimerRef.current = setTimeout(() => {
      window.location.assign(targetHref);
    }, NAVIGATION_RECOVERY_TIMEOUT_MS);

    void waitForImageWarmup(href).then(() => {
      startTransition(() => router.push(href, { scroll: false }));
    });
  };

  const previousPage = Math.max(1, currentPage - 1);
  const followingPage = Math.min(totalPages, currentPage + 1);

  return (
    <section
      aria-busy={isNavigating}
      className="relative scroll-mt-24"
      data-rooms-results
      id="room-results"
      ref={resultsRef}
    >
      <div className={`transition-opacity duration-150 ${isNavigating ? "pointer-events-none opacity-70" : "opacity-100"}`}>
        {children}
      </div>

      {totalPages > 1 ? (
        <nav aria-label="Phân trang" className="mt-12 flex items-center justify-center gap-2 font-button text-button">
          <PaginationLink
            disabled={currentPage <= 1}
            href={previousHref}
            label="Trang trước"
            onNavigate={(event) => navigate(event, previousHref, previousPage)}
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.8} />
          </PaginationLink>

          {pageLinks.map((item, index) => (
            <Fragment key={item.page}>
              {index > 0 && item.page - pageLinks[index - 1].page > 1 ? (
                <span aria-hidden="true" className="px-1 text-secondary">…</span>
              ) : null}
              <PaginationLink
                current={item.page === currentPage}
                href={item.href}
                label={`Trang ${item.page}`}
                onNavigate={(event) => navigate(event, item.href, item.page)}
              >
                {pendingPage === item.page ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={18} strokeWidth={1.8} />
                ) : item.page}
              </PaginationLink>
            </Fragment>
          ))}

          <PaginationLink
            disabled={currentPage >= totalPages}
            href={nextHref ?? pageLinks.at(-1)?.href ?? "/rooms"}
            label="Trang sau"
            onNavigate={(event) => navigate(event, nextHref ?? "/rooms", followingPage)}
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </PaginationLink>
        </nav>
      ) : null}

      <p aria-atomic="true" aria-live="polite" className="sr-only">{announcement}</p>
    </section>
  );
}

export function RoomsImagePreloader({ href, imageUrls }: Readonly<{ href: string; imageUrls: string[] }>) {
  const serializedImageUrls = JSON.stringify(imageUrls);

  useEffect(() => {
    const urls = JSON.parse(serializedImageUrls) as string[];
    if (!urls.length || imageWarmups.has(href)) return;
    if (imageWarmups.size >= 24) imageWarmups.delete(imageWarmups.keys().next().value as string);
    imageWarmups.set(
      href,
      Promise.all(urls.map(preloadImage)).then(() => undefined),
    );
  }, [href, serializedImageUrls]);

  return null;
}

export function RoomsUrlCanonicalizer({ href }: Readonly<{ href: string }>) {
  useEffect(() => {
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (currentHref !== href) window.history.replaceState(window.history.state, "", href);
  }, [href]);

  return null;
}

function PaginationLink({
  children,
  current = false,
  disabled = false,
  href,
  label,
  onNavigate,
}: Readonly<{
  children: ReactNode;
  current?: boolean;
  disabled?: boolean;
  href: string;
  label: string;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}>) {
  return (
    <Link
      aria-current={current ? "page" : undefined}
      aria-disabled={disabled || undefined}
      aria-label={label}
      className={`motion-chip flex size-11 items-center justify-center rounded-md transition-colors ${
        current
          ? "bg-primary text-on-primary"
          : "border border-outline-variant/60 text-secondary hover:border-primary hover:text-primary"
      } ${disabled ? "pointer-events-none opacity-45" : ""}`}
      href={href}
      onClick={onNavigate}
      prefetch
    >
      {children}
    </Link>
  );
}

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.onload = () => {
      void image.decode().catch(() => undefined).finally(resolve);
    };
    image.onerror = () => resolve();
    image.src = url;
    if (image.complete && image.naturalWidth > 0) void image.decode().catch(() => undefined).finally(resolve);
  });
}

async function waitForImageWarmup(href: string) {
  const warmup = imageWarmups.get(href);
  if (!warmup) return;
  await Promise.race([
    warmup,
    new Promise<void>((resolve) => setTimeout(resolve, IMAGE_WARMUP_WAIT_MS)),
  ]);
}
