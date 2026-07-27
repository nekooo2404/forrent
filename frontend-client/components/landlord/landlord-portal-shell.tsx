"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { CalendarDays, CircleDollarSign, DoorOpen, Inbox, LoaderCircle, MessageSquareText } from "@/components/ui/icons";
import { PublicShell } from "@/components/public-shell";
import { getAuthSessionDetails } from "@/lib/auth-storage";

import { LandlordAccessState } from "./landlord-room-shared";

const allPortalItems = [
  { href: "/landlord", label: "Việc cần xử lý", icon: Inbox },
  { href: "/landlord/rooms", label: "Quản lý phòng", icon: DoorOpen },
  { href: "/landlord/viewing-requests", label: "Yêu cầu xem phòng", icon: MessageSquareText },
  { href: "/landlord/calendar", label: "Lịch xem phòng", icon: CalendarDays },
  { href: "/landlord/commissions", label: "Hoa hồng", icon: CircleDollarSign },
] as const;

export function LandlordPortalShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<"loading" | "anonymous" | "forbidden" | "ready">("loading");
  const [role, setRole] = useState<string | null>(null);
  const portalItems = role === "INDEPENDENT_SALER"
    ? allPortalItems
    : allPortalItems.filter((item) => item.href !== "/landlord/commissions");
  const activePortalItem = portalItems.find((item) => (
    item.href === "/landlord"
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  )) ?? portalItems[0];

  useEffect(() => {
    let mounted = true;
    getAuthSessionDetails()
      .then((session) => {
        if (!mounted) return;
        if (!session.authenticated) setAccess("anonymous");
        else if (!session.role || !["LANDLORD", "INDEPENDENT_SALER"].includes(session.role)) setAccess("forbidden");
        else {
          setRole(session.role);
          if (session.role === "LANDLORD" && pathname.startsWith("/landlord/commissions")) {
            router.replace("/landlord");
          } else {
            setAccess("ready");
          }
        }
      })
      .catch(() => {
        if (mounted) setAccess("anonymous");
      });
    return () => { mounted = false; };
  }, [pathname, router]);

  return (
    <PublicShell active="landlord">
      {access === "loading" ? (
        <section className="flex min-h-[55vh] items-center justify-center px-margin-mobile pt-24 md:px-margin-desktop">
          <div className="text-center">
            <LoaderCircle aria-hidden="true" className="mx-auto animate-spin text-primary" size={28} />
            <p className="mt-3 text-on-surface-variant">Đang mở khu vực quản trị...</p>
          </div>
        </section>
      ) : null}
      {access === "anonymous" ? (
        <LandlordAccessState
          actionHref="/log-in"
          actionLabel="Đăng nhập"
          description="Đăng nhập bằng tài khoản người cho thuê để quản lý phòng, lịch hẹn và hoa hồng."
          title="Bạn cần đăng nhập"
        />
      ) : null}
      {access === "forbidden" ? (
        <LandlordAccessState
          actionHref="/contact"
          actionLabel="Liên hệ ForRent"
          description="Khu vực này chỉ dành cho tài khoản đã đăng ký vai trò người cho thuê."
          title="Tài khoản không có quyền truy cập"
        />
      ) : null}
      {access === "ready" ? (
        <div className="tabular-nums">
          <header className="border-b border-outline-variant/70 bg-surface-container-low px-margin-mobile pb-0 pt-24 md:px-margin-desktop md:pt-28">
            <div className="mx-auto max-w-container-max">
              <h1 className="font-headline-md text-3xl text-on-surface md:text-4xl">Quản lý cho thuê</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant md:text-base">
                Theo dõi phòng, khách hẹn xem và khoản hoa hồng thuộc tài khoản của bạn.
              </p>

              <div className="mt-6 pb-4 lg:hidden">
                <label className="mb-2 block text-sm font-semibold text-on-surface" htmlFor="landlord-section">
                  Mục quản lý
                </label>
                <select
                  className="min-h-12 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-base font-semibold text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  id="landlord-section"
                  onChange={(event) => router.push(event.target.value)}
                  value={activePortalItem.href}
                >
                  {portalItems.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}
                </select>
              </div>

              <nav aria-label="Điều hướng quản lý cho thuê" className="mt-6 hidden lg:block">
                <ul className="flex flex-wrap gap-1">
                  {portalItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.href === "/landlord"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
                            active
                              ? "border-primary text-primary"
                              : "border-transparent text-on-surface-variant hover:border-outline hover:text-on-surface"
                          }`}
                          href={item.href}
                        >
                          <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
          </header>
          {children}
        </div>
      ) : null}
    </PublicShell>
  );
}
