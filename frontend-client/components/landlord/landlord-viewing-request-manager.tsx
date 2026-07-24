"use client";

import { useCallback, useEffect, useState } from "react";

import { CalendarDays, Mail, Phone, RefreshCw, Search } from "@/components/ui/icons";
import { useToast } from "@/hooks/use-toast";

import {
  formatLandlordDate,
  formatLandlordDateTime,
  landlordRequest,
  type LandlordPaginated,
  type LandlordViewingRequest,
  timeSlotLabels,
} from "./landlord-api";
import {
  landlordInputClass,
  LandlordLoadState,
  LandlordPageHeader,
  landlordPrimaryButton,
  landlordSecondaryButton,
  LandlordViewingStatus,
} from "./landlord-portal-ui";

const statusOptions = [
  ["", "Tất cả trạng thái"],
  ["NEW", "Mới"],
  ["CONTACTED", "Đã liên hệ"],
  ["SCHEDULED", "Đã xếp lịch"],
  ["VIEWED", "Đã xem phòng"],
  ["CONVERTED", "Đã thuê"],
  ["CANCELLED", "Đã hủy"],
  ["NO_SHOW", "Không đến"],
] as const;

export function LandlordViewingRequestManager() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LandlordViewingRequest[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [terminalAction, setTerminalAction] = useState<{ id: number; status: "CANCELLED" | "NO_SHOW" } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentSlot, setAppointmentSlot] = useState("morning");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ ordering: "-created_at", page_size: "100" });
      if (appliedSearch) query.set("search", appliedSearch);
      if (appliedStatus) query.set("status", appliedStatus);
      const data = await landlordRequest<LandlordPaginated<LandlordViewingRequest>>(`viewing-requests?${query}`);
      setRequests(data.results);
      setCount(data.count);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể tải yêu cầu xem phòng.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, appliedStatus]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function updateStatus(request: LandlordViewingRequest, nextStatus: LandlordViewingRequest["status"]) {
    setBusyId(request.id);
    try {
      await landlordRequest<LandlordViewingRequest>(`viewing-requests/${request.id}`, {
        body: JSON.stringify({ status: nextStatus }),
        method: "PATCH",
      });
      setTerminalAction(null);
      toast({ type: "success", title: "Đã cập nhật yêu cầu", message: "Trạng thái mới đã được lưu." });
      await loadRequests();
    } catch (caughtError) {
      toast({
        type: "error",
        title: "Không thể cập nhật",
        message: caughtError instanceof Error ? caughtError.message : "Vui lòng thử lại.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmAppointment(request: LandlordViewingRequest) {
    if (!appointmentDate) {
      toast({ type: "warning", title: "Thiếu ngày xem phòng", message: "Vui lòng chọn ngày trước khi lưu lịch." });
      return;
    }
    setBusyId(request.id);
    try {
      await landlordRequest<LandlordViewingRequest>(`viewing-requests/${request.id}/confirm-appointment`, {
        body: JSON.stringify({
          appointment_date: appointmentDate,
          appointment_time_slot: appointmentSlot,
        }),
        method: "POST",
      });
      setScheduleId(null);
      setAppointmentDate("");
      toast({ type: "success", title: "Đã xác nhận lịch xem phòng", message: "Lịch hẹn đã được thêm vào calendar." });
      await loadRequests();
    } catch (caughtError) {
      toast({
        type: "error",
        title: "Không thể xác nhận lịch",
        message: caughtError instanceof Error ? caughtError.message : "Vui lòng thử lại.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="px-margin-mobile py-10 md:px-margin-desktop md:py-12">
      <div className="mx-auto max-w-container-max">
        <LandlordPageHeader
          actions={(
            <button className={landlordSecondaryButton} onClick={() => void loadRequests()} type="button">
              <RefreshCw aria-hidden="true" size={18} />
              Làm mới
            </button>
          )}
          description="Liên hệ người thuê, xác nhận thời gian xem phòng và cập nhật kết quả sau buổi hẹn."
          eyebrow="Khách quan tâm"
          title="Yêu cầu xem phòng"
        />

        <form
          className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const nextSearch = search.trim();
            if (nextSearch === appliedSearch && status === appliedStatus) {
              void loadRequests();
            } else {
              setAppliedSearch(nextSearch);
              setAppliedStatus(status);
            }
          }}
        >
          <label className="relative" htmlFor="landlord-lead-search">
            <span className="sr-only">Tìm yêu cầu</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input
              className={`${landlordInputClass} pl-10`}
              id="landlord-lead-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên, số điện thoại, mã phòng..."
              type="search"
              value={search}
            />
          </label>
          <select aria-label="Lọc trạng thái" className={landlordInputClass} onChange={(event) => setStatus(event.target.value)} value={status}>
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className={landlordPrimaryButton} type="submit">Tìm kiếm</button>
        </form>

        <p className="mt-5 text-sm text-on-surface-variant">{count} yêu cầu thuộc các phòng của bạn</p>

        {loading || error ? (
          <div className="mt-6"><LandlordLoadState error={error} loading={loading} onRetry={() => void loadRequests()} /></div>
        ) : requests.length ? (
          <div className="mt-6 divide-y divide-outline-variant/70 border-y border-outline-variant/70">
            {requests.map((request) => (
              <article className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_18rem]" key={request.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-headline-sm text-xl text-on-surface">{request.full_name}</h3>
                    <LandlordViewingStatus status={request.status} />
                  </div>
                  <p className="mt-2 font-semibold text-primary">{request.room_title}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {request.room_code} · {request.ward_name}, {request.city_name}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <a className="inline-flex min-h-11 items-center gap-2 text-on-surface hover:text-primary" href={`tel:${request.phone}`}>
                      <Phone aria-hidden="true" size={17} />{request.phone}
                    </a>
                    <a className="inline-flex min-h-11 items-center gap-2 text-on-surface hover:text-primary" href={`mailto:${request.email}`}>
                      <Mail aria-hidden="true" size={17} />{request.email}
                    </a>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-on-surface-variant sm:grid-cols-2">
                    <p>Khách đề xuất: <strong className="text-on-surface">{formatLandlordDate(request.preferred_viewing_date)} · {timeSlotLabels[request.preferred_viewing_time_slot] || "Chưa chọn"}</strong></p>
                    <p>Lịch đã chốt: <strong className="text-on-surface">{formatLandlordDate(request.appointment_date)}{request.appointment_date ? ` · ${timeSlotLabels[request.appointment_time_slot] || ""}` : ""}</strong></p>
                  </div>
                  <p className="mt-2 text-xs text-on-surface-variant">Gửi lúc {formatLandlordDateTime(request.created_at)}</p>
                </div>

                <div className="flex flex-col justify-center gap-2">
                  {request.status === "NEW" ? (
                    <button className={landlordPrimaryButton} disabled={busyId === request.id} onClick={() => void updateStatus(request, "CONTACTED")} type="button">
                      Đã liên hệ khách
                    </button>
                  ) : null}
                  {["NEW", "CONTACTED", "SCHEDULED"].includes(request.status) ? (
                    <button className={landlordSecondaryButton} disabled={busyId === request.id} onClick={() => { setTerminalAction(null); setScheduleId(scheduleId === request.id ? null : request.id); }} type="button">
                      <CalendarDays aria-hidden="true" size={18} />
                      {request.status === "SCHEDULED" ? "Đổi lịch hẹn" : "Xác nhận lịch hẹn"}
                    </button>
                  ) : null}
                  {request.status === "SCHEDULED" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button className={landlordSecondaryButton} disabled={busyId === request.id} onClick={() => void updateStatus(request, "VIEWED")} type="button">Đã xem</button>
                      <button className={landlordSecondaryButton} disabled={busyId === request.id} onClick={() => { setScheduleId(null); setTerminalAction({ id: request.id, status: "NO_SHOW" }); }} type="button">Không đến</button>
                    </div>
                  ) : null}
                  {["NEW", "CONTACTED", "SCHEDULED", "VIEWED"].includes(request.status) ? (
                    <button className={`${landlordSecondaryButton} text-error`} disabled={busyId === request.id} onClick={() => { setScheduleId(null); setTerminalAction({ id: request.id, status: "CANCELLED" }); }} type="button">Hủy yêu cầu</button>
                  ) : null}
                </div>

                {scheduleId === request.id ? (
                  <div className="grid gap-3 border-l-2 border-primary bg-surface-container-low p-4 sm:grid-cols-[1fr_1fr_auto] lg:col-span-2">
                    <label className="text-sm font-semibold text-on-surface">
                      Ngày xem
                      <input className={`${landlordInputClass} mt-2`} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setAppointmentDate(event.target.value)} type="date" value={appointmentDate} />
                    </label>
                    <label className="text-sm font-semibold text-on-surface">
                      Khung giờ
                      <select className={`${landlordInputClass} mt-2`} onChange={(event) => setAppointmentSlot(event.target.value)} value={appointmentSlot}>
                        {Object.entries(timeSlotLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <button className={`${landlordPrimaryButton} self-end`} disabled={busyId === request.id} onClick={() => void confirmAppointment(request)} type="button">Lưu lịch</button>
                  </div>
                ) : null}
                {terminalAction?.id === request.id ? (
                  <div className="flex flex-col gap-3 border-l-2 border-error bg-error-container p-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
                    <p className="text-sm font-semibold text-on-error-container">
                      {terminalAction.status === "NO_SHOW"
                        ? "Xác nhận khách không đến? Trạng thái này không thể hoàn tác."
                        : "Xác nhận hủy yêu cầu? Trạng thái này không thể hoàn tác."}
                    </p>
                    <div className="flex gap-2">
                      <button className={landlordSecondaryButton} onClick={() => setTerminalAction(null)} type="button">Quay lại</button>
                      <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-error px-4 text-sm font-semibold text-on-error" disabled={busyId === request.id} onClick={() => void updateStatus(request, terminalAction.status)} type="button">Xác nhận</button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 border-y border-outline-variant/70 py-14 text-center">
            <h3 className="font-headline-sm text-xl text-on-surface">Chưa có yêu cầu phù hợp</h3>
            <p className="mt-2 text-on-surface-variant">Yêu cầu mới từ các phòng của bạn sẽ xuất hiện tại đây.</p>
          </div>
        )}
      </div>
    </section>
  );
}
