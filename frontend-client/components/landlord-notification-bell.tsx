"use client";

import Link from "next/link";
import { Bell, Check, LoaderCircle, RefreshCw } from "@/components/ui/icons";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  formatLandlordDate,
  formatLandlordDateTime,
  landlordRequest,
  type LandlordNotification,
  type LandlordNotificationFeed,
  timeSlotLabels,
} from "@/components/landlord/landlord-api";
import { getAuthSessionDetails } from "@/lib/auth-storage";

const POLL_INTERVAL_MS = 5_000;
const EMPTY_FEED: LandlordNotificationFeed = { results: [], unread_count: 0 };

function notificationSchedule(notification: LandlordNotification) {
  const date = formatLandlordDate(notification.preferred_viewing_date);
  const slot = timeSlotLabels[notification.preferred_viewing_time_slot] ?? "Chưa chọn giờ";
  return `${date} · ${slot}`;
}

export function LandlordNotificationBell() {
  const [eligible, setEligible] = useState(false);
  const [feed, setFeed] = useState<LandlordNotificationFeed>(EMPTY_FEED);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestInFlightRef = useRef(false);

  const refreshFeed = useCallback(async (showLoading = false) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    if (showLoading) setIsLoading(true);
    try {
      const data = await landlordRequest<LandlordNotificationFeed>("notifications?limit=8");
      setFeed(data);
      setHasError(false);
    } catch {
      setHasError(true);
    } finally {
      requestInFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getAuthSessionDetails()
      .then((session) => {
        if (!active) return;
        setEligible(session.authenticated && session.role === "LANDLORD");
      })
      .catch(() => {
        if (active) setEligible(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!eligible) return;

    void refreshFeed(true);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshFeed();
    }, POLL_INTERVAL_MS);
    const handleFocus = () => void refreshFeed();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refreshFeed();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [eligible, refreshFeed]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function markRead(notification: LandlordNotification) {
    if (notification.is_read) return;
    setFeed((current) => ({
      results: current.results.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
      unread_count: Math.max(current.unread_count - 1, 0),
    }));
    try {
      await landlordRequest(`notifications/${notification.id}/mark-read`, { method: "POST" });
    } catch {
      void refreshFeed();
    }
  }

  async function markAllRead() {
    const previous = feed;
    setFeed((current) => ({
      results: current.results.map((item) => ({ ...item, is_read: true })),
      unread_count: 0,
    }));
    try {
      await landlordRequest("notifications/mark-all-read", { method: "POST" });
    } catch {
      setFeed(previous);
      setHasError(true);
    }
  }

  if (!eligible) return null;

  const unreadLabel = feed.unread_count > 99 ? "99+" : String(feed.unread_count);

  return (
    <div className="relative z-[65] shrink-0" ref={containerRef}>
      <button
        aria-controls="landlord-notification-popover"
        aria-expanded={isOpen}
        aria-label={feed.unread_count ? `Thông báo, ${feed.unread_count} chưa đọc` : "Thông báo"}
        className="premium-button relative inline-flex size-11 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container-lowest text-primary"
        data-testid="landlord-notification-bell"
        onClick={() => {
          setIsOpen((current) => !current);
          void refreshFeed();
        }}
        ref={triggerRef}
        type="button"
      >
        <Bell aria-hidden="true" size={21} strokeWidth={1.8} />
        {feed.unread_count ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary px-1 text-[11px] font-bold leading-none text-on-primary"
          >
            {unreadLabel}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section
          aria-label="Thông báo yêu cầu xem phòng"
          className="fixed inset-x-3 top-[4.5rem] z-[70] max-h-[min(70vh,34rem)] overflow-hidden rounded-lg border border-outline-variant/35 bg-surface-container-lowest shadow-high lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-3 lg:w-[24rem]"
          id="landlord-notification-popover"
        >
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-outline-variant/25 px-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-primary">Yêu cầu tư vấn</h2>
              <p className="text-xs text-secondary">{feed.unread_count} thông báo chưa đọc</p>
            </div>
            {feed.unread_count ? (
              <button
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-primary transition-colors hover:text-primary-container"
                onClick={() => void markAllRead()}
                type="button"
              >
                <Check aria-hidden="true" size={16} />
                Đánh dấu đã đọc
              </button>
            ) : null}
          </div>

          <div className="max-h-[calc(min(70vh,34rem)-3.5rem)] overflow-y-auto overscroll-contain">
            {isLoading && !feed.results.length ? (
              <div className="flex min-h-32 items-center justify-center text-secondary" role="status">
                <LoaderCircle aria-hidden="true" className="animate-spin" size={22} />
                <span className="sr-only">Đang tải thông báo</span>
              </div>
            ) : null}

            {!isLoading && hasError && !feed.results.length ? (
              <div className="flex min-h-36 flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-secondary">Chưa thể tải thông báo.</p>
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-outline-variant/40 px-3 text-sm font-semibold text-primary"
                  onClick={() => void refreshFeed(true)}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={16} />
                  Thử lại
                </button>
              </div>
            ) : null}

            {!isLoading && !hasError && !feed.results.length ? (
              <div className="flex min-h-32 flex-col items-center justify-center px-6 text-center">
                <Bell aria-hidden="true" className="mb-2 text-secondary" size={22} />
                <p className="text-sm font-semibold text-primary">Chưa có yêu cầu mới</p>
                <p className="mt-1 text-xs text-secondary">Yêu cầu xem phòng mới sẽ xuất hiện tại đây.</p>
              </div>
            ) : null}

            {feed.results.length ? (
              <ul className="divide-y divide-outline-variant/20" role="list">
                {feed.results.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      className={`block min-h-11 px-4 py-3 transition-colors hover:bg-surface-container ${
                        notification.is_read ? "bg-surface-container-lowest" : "bg-surface-container-low"
                      }`}
                      href="/landlord/viewing-requests"
                      onClick={() => {
                        void markRead(notification);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={`mt-2 size-2 shrink-0 rounded-full ${
                            notification.is_read ? "bg-outline-variant" : "bg-primary"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-primary">
                            <strong className="font-semibold">{notification.requester_name}</strong> cần tư vấn phòng
                          </p>
                          <p className="mt-0.5 truncate text-sm font-semibold text-primary">
                            {notification.room_title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-secondary">
                            {notificationSchedule(notification)}
                          </p>
                          <p className="text-xs text-secondary">
                            Gửi lúc {formatLandlordDateTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
