"use client";

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { adminList, adminMessageFrom, leadStatusLabel, type AdminViewingRequest } from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminEmptyState,
  AdminInlineMessage,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  adminButtonSecondary,
} from "./admin-ui";

const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const timeSlotLabels: Record<string, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  evening: "Tối",
};
const monthTitleFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
});
const agendaDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
  weekday: "long",
});

export function AdminCalendar() {
  const { token } = useAdminAuth();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [appointments, setAppointments] = useState<AdminViewingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const monthKey = formatDateKey(monthStart);
  const calendarDays = useMemo(() => buildCalendarDays(month), [month]);
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, AdminViewingRequest[]>();
    appointments.forEach((appointment) => {
      if (!appointment.appointment_date) return;
      const current = grouped.get(appointment.appointment_date) ?? [];
      grouped.set(appointment.appointment_date, [...current, appointment]);
    });
    return grouped;
  }, [appointments]);
  const agendaGroups = useMemo(
    () => Array.from(appointmentsByDate.entries()).sort(([left], [right]) => left.localeCompare(right)),
    [appointmentsByDate],
  );

  async function loadAppointments() {
    setIsLoading(true);
    setError("");
    setMessage("");
    const params = {
      appointment_date_from: formatDateKey(monthStart),
      appointment_date_to: formatDateKey(monthEnd),
      ordering: "appointment_date",
      page: 1,
      page_size: 100,
    };

    try {
      const firstPage = await adminList<AdminViewingRequest>("viewing-requests", token, params);
      const pageCount = Math.ceil(firstPage.count / 100);
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          adminList<AdminViewingRequest>("viewing-requests", token, { ...params, page: index + 2 }),
        ),
      );
      setAppointments([firstPage.results, ...remainingPages.map((page) => page.results)].flat());
      setMessage(firstPage.count ? `${firstPage.count} lịch đã xác nhận trong tháng này.` : "Tháng này chưa có lịch đã xác nhận.");
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải lịch xem phòng."));
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
    // The month key is the only value that should trigger a calendar reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, token]);

  function moveMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function goToCurrentMonth() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <>
            <button className={adminButtonSecondary} onClick={goToCurrentMonth} type="button">
              Hôm nay
            </button>
            <button className={adminButtonSecondary} onClick={loadAppointments} type="button">
              <RefreshCw size={16} strokeWidth={1.8} />
              Làm mới
            </button>
          </>
        }
        eyebrow="Lịch vận hành"
        subtitle="Theo dõi các lịch xem phòng đã được nhân viên xác nhận với người thuê."
        title="Lịch xem phòng"
      />

      <AdminInlineMessage error={error} message={message} />

      <AdminPanel
        className="mt-5"
        title={monthTitleFormatter.format(month)}
        toolbar={
          <div className="flex items-center gap-2">
            <button aria-label="Tháng trước" className={calendarIconButton} onClick={() => moveMonth(-1)} type="button">
              <ChevronLeft size={18} strokeWidth={1.8} />
            </button>
            <button aria-label="Tháng sau" className={calendarIconButton} onClick={() => moveMonth(1)} type="button">
              <ChevronRight size={18} strokeWidth={1.8} />
            </button>
          </div>
        }
      >
        {isLoading ? (
          <AdminLoadingState label="Đang tải lịch xem phòng..." />
        ) : appointments.length ? (
          <>
            <div className="space-y-4 md:hidden">
              {agendaGroups.map(([date, items]) => (
                <section key={date}>
                  <h3 className="mb-2 text-sm font-semibold text-primary">{formatAgendaDate(date)}</h3>
                  <div className="space-y-2">
                    {items.map((appointment) => (
                      <Link
                        className="block min-h-11 rounded-md border border-outline-variant/70 bg-surface-container-lowest p-3 transition-colors duration-200 hover:border-primary/40"
                        href={`/admin/leads/${appointment.id}`}
                        key={appointment.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-on-surface">{appointment.full_name}</span>
                          <span className="shrink-0 text-xs font-semibold text-primary">
                            {(timeSlotLabels[appointment.appointment_time_slot] ?? appointment.appointment_time_slot) || "Đã hẹn"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-secondary">{appointment.room_title}</p>
                        <p className="mt-1 text-xs text-secondary">{leadStatusLabel(appointment.status)}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="hidden md:block">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 border-b border-outline-variant/70">
                {weekDays.map((day) => (
                  <div className="px-2 py-3 text-center text-xs font-semibold uppercase text-secondary" key={day}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l border-t border-outline-variant/70">
                {calendarDays.map((day) => {
                  const dayAppointments = appointmentsByDate.get(formatDateKey(day)) ?? [];
                  const isCurrentMonth = day.getMonth() === month.getMonth();
                  const isToday = formatDateKey(day) === formatDateKey(new Date());
                  return (
                    <div
                      className={`min-h-32 border-b border-r border-outline-variant/70 p-2 ${isCurrentMonth ? "bg-surface-container-lowest" : "bg-surface-container-low/60"}`}
                      key={formatDateKey(day)}
                    >
                      <span className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-primary text-on-primary" : isCurrentMonth ? "text-primary" : "text-secondary"}`}>
                        {day.getDate()}
                      </span>
                      <div className="mt-2 space-y-1.5">
                        {dayAppointments.map((appointment) => (
                          <Link
                            className={`block rounded-md border border-outline-variant/70 bg-surface-container-low px-2 py-1.5 text-xs transition-colors duration-200 hover:border-primary/40 hover:bg-surface-container ${appointment.status === "CANCELLED" || appointment.status === "NO_SHOW" ? "opacity-60" : ""}`}
                            href={`/admin/leads/${appointment.id}`}
                            key={appointment.id}
                            title={`${appointment.full_name} - ${appointment.room_title}`}
                          >
                            <span className="block truncate font-semibold text-primary">
                              {(timeSlotLabels[appointment.appointment_time_slot] ?? appointment.appointment_time_slot) || "Đã hẹn"}
                            </span>
                            <span className="block truncate text-on-surface">{appointment.full_name}</span>
                            <span className="block truncate text-secondary">{appointment.room_title}</span>
                            <span className="block truncate text-secondary">{leadStatusLabel(appointment.status)}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </>
        ) : (
          <AdminEmptyState
            description="Khi admin xác nhận ngày và khung giờ trong yêu cầu xem phòng, lịch hẹn sẽ xuất hiện tại đây."
            icon={<CalendarDays size={28} strokeWidth={1.8} />}
            title="Chưa có lịch xem phòng"
          />
        )}
      </AdminPanel>

      {!isLoading && appointments.length ? (
        <p className="mt-4 text-sm text-secondary">Chọn một lịch hẹn để mở chi tiết người thuê và cập nhật trạng thái.</p>
      ) : null}
    </div>
  );
}

const calendarIconButton = "inline-flex size-11 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-lowest text-on-surface transition-colors duration-200 hover:border-primary/40 hover:text-primary";

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
}

function formatAgendaDate(value: string) {
  return agendaDateFormatter.format(new Date(`${value}T00:00:00`));
}
