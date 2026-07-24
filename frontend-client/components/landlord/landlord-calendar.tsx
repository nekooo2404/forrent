"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "@/components/ui/icons";

import {
  formatLandlordDate,
  landlordRequest,
  type LandlordPaginated,
  type LandlordViewingRequest,
  timeSlotLabels,
} from "./landlord-api";
import {
  LandlordLoadState,
  LandlordPageHeader,
  landlordSecondaryButton,
  LandlordViewingStatus,
} from "./landlord-portal-ui";

const monthFormatter = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("vi-VN", { weekday: "long" });

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export function LandlordCalendar() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [appointments, setAppointments] = useState<LandlordViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const days = useMemo(() => calendarDays(month), [month]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        appointment_date_from: dateKey(days[0]),
        appointment_date_to: dateKey(days[days.length - 1]),
        ordering: "appointment_date",
        page_size: "100",
      });
      const data = await landlordRequest<LandlordPaginated<LandlordViewingRequest>>(`viewing-requests?${query}`);
      setAppointments(data.results.filter((item) => Boolean(item.appointment_date)));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể tải lịch xem phòng.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, LandlordViewingRequest[]>();
    appointments.forEach((item) => {
      if (!item.appointment_date) return;
      grouped.set(item.appointment_date, [...(grouped.get(item.appointment_date) ?? []), item]);
    });
    return grouped;
  }, [appointments]);

  const agenda = useMemo(
    () => {
      const monthStart = dateKey(month);
      const monthEnd = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
      return appointments
        .filter((item) => item.appointment_date && item.appointment_date >= monthStart && item.appointment_date <= monthEnd)
        .sort((a, b) => `${a.appointment_date}${a.appointment_time_slot}`.localeCompare(`${b.appointment_date}${b.appointment_time_slot}`));
    },
    [appointments, month],
  );

  function moveMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className="px-margin-mobile py-10 md:px-margin-desktop md:py-12">
      <div className="mx-auto max-w-container-max">
        <LandlordPageHeader
          actions={(
            <button className={landlordSecondaryButton} onClick={() => void loadAppointments()} type="button">
              <RefreshCw aria-hidden="true" size={18} />Làm mới
            </button>
          )}
          description="Lịch chỉ bao gồm các buổi xem đã xác nhận cho phòng thuộc tài khoản của bạn."
          eyebrow="Lịch hẹn"
          title="Lịch xem phòng"
        />

        <div className="mt-6 flex items-center justify-between border-b border-outline-variant/70 pb-4">
          <button aria-label="Tháng trước" className={landlordSecondaryButton} onClick={() => moveMonth(-1)} type="button"><ChevronLeft size={18} /></button>
          <h3 className="font-headline-sm text-xl capitalize text-on-surface">{monthFormatter.format(month)}</h3>
          <button aria-label="Tháng sau" className={landlordSecondaryButton} onClick={() => moveMonth(1)} type="button"><ChevronRight size={18} /></button>
        </div>

        {loading || error ? (
          <div className="mt-6"><LandlordLoadState error={error} loading={loading} onRetry={() => void loadAppointments()} /></div>
        ) : (
          <>
            <div className="mt-6 md:hidden">
              {agenda.length ? (
                <div className="divide-y divide-outline-variant/70 border-y border-outline-variant/70">
                  {agenda.map((item) => (
                    <article className="py-5" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-tertiary">{weekdayFormatter.format(new Date(`${item.appointment_date}T00:00:00`))}</p>
                          <h4 className="mt-1 font-headline-sm text-lg text-on-surface">{formatLandlordDate(item.appointment_date)}</h4>
                        </div>
                        <LandlordViewingStatus status={item.status} />
                      </div>
                      <p className="mt-3 font-semibold text-on-surface">{timeSlotLabels[item.appointment_time_slot]}</p>
                      <p className="mt-1 text-primary">{item.full_name} · {item.phone}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">{item.room_code} · {item.room_title}</p>
                    </article>
                  ))}
                </div>
              ) : <CalendarEmpty />}
            </div>

            <div className="mt-6 hidden md:block">
              <div className="grid grid-cols-7 border-b border-outline-variant/70 text-center text-xs font-semibold uppercase text-on-surface-variant">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => <div className="py-3" key={label}>{label}</div>)}
              </div>
              <div className="grid grid-cols-7 border-l border-outline-variant/70">
                {days.map((day) => {
                  const key = dateKey(day);
                  const items = appointmentsByDate.get(key) ?? [];
                  const isCurrentMonth = day.getMonth() === month.getMonth();
                  const isToday = key === dateKey(new Date());
                  return (
                    <div className="min-h-32 border-b border-r border-outline-variant/70 bg-surface-container-lowest p-2" key={key}>
                      <span className={`inline-flex size-7 items-center justify-center rounded-full text-sm ${isToday ? "bg-primary font-semibold text-on-primary" : isCurrentMonth ? "text-on-surface" : "text-outline"}`}>{day.getDate()}</span>
                      <div className="mt-2 space-y-1.5">
                        {items.slice(0, 2).map((item) => (
                          <Link className="block rounded-md bg-surface-container-low px-2 py-1.5 text-xs leading-4 text-on-surface hover:bg-primary-container" href="/landlord/viewing-requests" key={item.id}>
                            <span className="block font-semibold">{timeSlotLabels[item.appointment_time_slot]?.split(",")[0]} · {item.full_name}</span>
                            <span className="block truncate text-on-surface-variant">{item.room_code}</span>
                          </Link>
                        ))}
                        {items.length > 2 ? <p className="px-2 text-xs font-semibold text-primary">+{items.length - 2} lịch khác</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!appointments.length ? <CalendarEmpty /> : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CalendarEmpty() {
  return (
    <div className="py-12 text-center">
      <CalendarDays aria-hidden="true" className="mx-auto text-outline" size={32} />
      <h3 className="mt-3 font-headline-sm text-xl text-on-surface">Chưa có lịch trong tháng này</h3>
      <p className="mt-2 text-on-surface-variant">Xác nhận thời gian tại mục Yêu cầu xem phòng để đưa lịch hẹn vào đây.</p>
    </div>
  );
}
