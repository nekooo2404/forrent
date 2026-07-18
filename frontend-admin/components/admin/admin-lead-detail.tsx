"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Mail, MapPin, Phone, UserRound } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  adminList,
  adminMessageFrom,
  adminRequest,
  canManuallyTransitionLead,
  formatAdminDate,
  formatAdminDateOnly,
  formatAdminVnd,
  type AdminUser,
  type AdminViewingRequest,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminEmptyState,
  AdminInlineMessage,
  AdminLeadBadge,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  adminButtonPrimary,
  adminButtonSecondary,
  adminInputClass,
  adminSelectClass,
} from "./admin-ui";

const statuses = [
  { label: "Yêu cầu mới", value: "NEW" },
  { label: "Đã liên hệ", value: "CONTACTED" },
  { label: "Đã lên lịch", value: "SCHEDULED" },
  { label: "Đã xem phòng", value: "VIEWED" },
  { label: "Không đến xem", value: "NO_SHOW" },
  { label: "Đã hủy", value: "CANCELLED" },
];

export function AdminLeadDetail({ id }: Readonly<{ id: string }>) {
  const { token } = useAdminAuth();
  const [lead, setLead] = useState<AdminViewingRequest | null>(null);
  const [salers, setSalers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState("NEW");
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTimeSlot, setAppointmentTimeSlot] = useState("");
  const [moveOutNote, setMoveOutNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadLead() {
    setIsLoading(true);
    setError("");
    try {
      const data = await adminRequest<AdminViewingRequest>(`viewing-requests/${id}`, token);
      setLead(data);
      setStatus(data.status);
      setNote(data.saler_note ?? "");
      setAssignedTo(data.assigned_to ? String(data.assigned_to) : "");
      setNextFollowUpAt(toDateTimeLocal(data.next_follow_up_at));
      setAppointmentDate(data.appointment_date || data.preferred_viewing_date || "");
      setAppointmentTimeSlot(data.appointment_time_slot || data.preferred_viewing_time_slot || "");
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải chi tiết yêu cầu."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLead();
    adminList<AdminUser>("users", token, { page_size: 100, ordering: "full_name", role: "SALER" })
      .then((response) => setSalers(response.results))
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await adminRequest<AdminViewingRequest>(`viewing-requests/${lead.id}`, token, {
        body: JSON.stringify({
          assigned_to: assignedTo ? Number(assignedTo) : null,
          next_follow_up_at: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
          saler_note: note,
          status,
        }),
        method: "PATCH",
      });
      setLead(updated);
      setMessage("Yêu cầu đã được cập nhật.");
    } catch (updateError) {
      setError(adminMessageFrom(updateError, "Không thể cập nhật yêu cầu."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmMovedIn() {
    if (!lead) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<Record<string, unknown>>(`viewing-requests/${lead.id}/confirm-moved-in`, token, {
        method: "POST",
      });
      setMessage("Đã xác nhận chuyển vào và ghi nhận hoa hồng.");
      await loadLead();
    } catch (confirmError) {
      setError(adminMessageFrom(confirmError, "Không thể xác nhận chuyển vào."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmAppointment() {
    if (!lead) return;
    if (!appointmentDate || !appointmentTimeSlot) {
      setError("Cần chọn ngày và khung giờ đã chốt trước khi xác nhận lịch xem.");
      return;
    }
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await adminRequest<AdminViewingRequest>(`viewing-requests/${lead.id}/confirm-appointment`, token, {
        body: JSON.stringify({
          appointment_date: appointmentDate,
          appointment_time_slot: appointmentTimeSlot,
        }),
        method: "POST",
      });
      setLead(updated);
      setStatus(updated.status);
      setMessage("Đã xác nhận lịch xem với ngày/khung giờ đã chốt.");
    } catch (confirmError) {
      setError(adminMessageFrom(confirmError, "Không thể xác nhận lịch xem."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMoveOut() {
    if (!lead) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<Record<string, unknown>>(`viewing-requests/${lead.id}/move-out`, token, {
        body: JSON.stringify({ note: moveOutNote.trim() }),
        method: "POST",
      });
      setMessage("Đã kết thúc lượt thuê và mở lại phòng.");
      await loadLead();
    } catch (moveOutError) {
      setError(adminMessageFrom(moveOutError, "Không thể kết thúc lượt thuê."));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <AdminLoadingState label="Đang tải chi tiết yêu cầu..." />;
  }

  if (!lead) {
    return (
      <>
        <AdminInlineMessage error={error} />
        <AdminEmptyState
          action={<Link className={adminButtonSecondary} href="/admin/leads">Quay lại danh sách</Link>}
          description="Yêu cầu này có thể đã bị xóa hoặc tài khoản không có quyền xem."
          title="Không tìm thấy yêu cầu"
        />
      </>
    );
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <Link className={adminButtonSecondary} href="/admin/leads">
            <ArrowLeft size={16} strokeWidth={1.8} />
            Danh sách yêu cầu
          </Link>
        }
        eyebrow={`Yêu cầu #${lead.id}`}
        subtitle={`${lead.room_title} · ${lead.ward_name}, ${lead.city_name}`}
        title={lead.full_name}
      />

      <div className="mb-5 space-y-3">
        <AdminInlineMessage error={error} message={message} />
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="space-y-6">
          <AdminPanel title="Thông tin khách hàng">
            <div className="flex items-start gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-primary text-on-primary">
                <UserRound size={28} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <h2 className="font-headline-sm text-2xl text-on-surface">{lead.full_name}</h2>
                <div className="mt-4 space-y-3 text-sm text-secondary">
                  <ContactLine icon={<Phone size={16} strokeWidth={1.8} />} value={lead.phone} />
                  <ContactLine icon={<Mail size={16} strokeWidth={1.8} />} value={lead.email} />
                  <ContactLine icon={<Clock3 size={16} strokeWidth={1.8} />} value={`Sinh ngày: ${formatAdminDateOnly(lead.date_of_birth)}`} />
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Phòng quan tâm">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-secondary">Room</p>
                <p className="mt-1 font-headline-sm text-2xl text-primary">{lead.room_title}</p>
              </div>
              <ContactLine icon={<MapPin size={16} strokeWidth={1.8} />} value={`${lead.ward_name}, ${lead.city_name}`} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Ngày xem mong muốn" value={formatAdminDateOnly(lead.preferred_viewing_date)} />
                <Info label="Khung giờ" value={timeSlotLabel(lead.preferred_viewing_time_slot)} />
                <Info label="Tạo lúc" value={formatAdminDate(lead.created_at)} />
                <Info label="Xác nhận lịch lúc" value={formatAdminDate(lead.appointment_confirmed_at)} />
                <Info label="Ngày đã chốt" value={formatAdminDateOnly(lead.appointment_date)} />
                <Info label="Khung giờ đã chốt" value={timeSlotLabel(lead.appointment_time_slot)} />
                <Info label="Nhân viên phụ trách" value={lead.assigned_to_name || "Chưa gán"} />
                <Info label="Follow-up" value={formatAdminDate(lead.next_follow_up_at)} />
              </div>
            </div>
          </AdminPanel>
        </div>

        <div className="space-y-6">
          <AdminPanel title="Trạng thái xử lý">
            <form className="space-y-5" onSubmit={handleUpdate}>
              <div className="grid gap-4 md:grid-cols-3">
                <Info label="Trạng thái hiện tại" value="" customValue={<AdminLeadBadge status={lead.status} />} />
                <Info label="Hoa hồng dự kiến" value={formatAdminVnd(lead.estimated_commission_amount)} />
                <Info label="Hoa hồng đã ghi nhận" value={formatAdminVnd(lead.actual_commission_amount)} />
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase text-secondary">Cập nhật trạng thái</span>
                <select className={adminSelectClass} onChange={(event) => setStatus(event.target.value)} value={status}>
                  {lead.status === "CONVERTED" ? <option value="CONVERTED">Đã chốt thuê</option> : null}
                  {statuses.filter((item) => canManuallyTransitionLead(lead.status, item.value)).map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase text-secondary">Nhân viên phụ trách</span>
                  <select className={adminSelectClass} onChange={(event) => setAssignedTo(event.target.value)} value={assignedTo}>
                    <option value="">Chưa gán</option>
                    {salers.map((saler) => (
                      <option key={saler.id} value={saler.id}>{saler.full_name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase text-secondary">Hẹn follow-up</span>
                  <input className={adminInputClass} onChange={(event) => setNextFollowUpAt(event.target.value)} type="datetime-local" value={nextFollowUpAt} />
                </label>
              </div>

              <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-4">
                <p className="mb-3 text-xs font-semibold uppercase text-secondary">Xác nhận lịch xem riêng</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input aria-label="Ngày xem đã xác nhận" className={adminInputClass} onChange={(event) => setAppointmentDate(event.target.value)} type="date" value={appointmentDate} />
                  <select aria-label="Khung giờ xem đã xác nhận" className={adminSelectClass} onChange={(event) => setAppointmentTimeSlot(event.target.value)} value={appointmentTimeSlot}>
                    <option value="">Chọn khung giờ</option>
                    <option value="morning">Buổi sáng</option>
                    <option value="afternoon">Buổi chiều</option>
                    <option value="evening">Buổi tối</option>
                  </select>
                </div>
                <button
                  className={`${adminButtonSecondary} mt-3`}
                  disabled={isSaving || !["NEW", "CONTACTED", "SCHEDULED"].includes(lead.status)}
                  onClick={handleConfirmAppointment}
                  type="button"
                >
                  Xác nhận lịch xem
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase text-secondary">Ghi chú tư vấn</span>
                <textarea className={`${adminInputClass} min-h-40`} onChange={(event) => setNote(event.target.value)} value={note} />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className={adminButtonPrimary} disabled={isSaving} type="submit">
                  {isSaving ? "Đang lưu..." : "Lưu cập nhật"}
                </button>
                <button
                  className={adminButtonSecondary}
                  disabled={isSaving || !["SCHEDULED", "VIEWED"].includes(lead.status)}
                  onClick={handleConfirmMovedIn}
                  type="button"
                >
                  <CheckCircle2 size={16} strokeWidth={1.8} />
                  Xác nhận chuyển vào
                </button>
              </div>
            </form>
          </AdminPanel>

          {lead.status === "CONVERTED" ? (
            <AdminPanel title="Kết thúc lượt thuê">
              <div className="space-y-4">
                <p className="text-sm leading-6 text-secondary">
                  Khi người thuê rời phòng, thao tác này kết thúc lease hiện tại và chuyển phòng về trạng thái trống.
                </p>
                <textarea
                  className={`${adminInputClass} min-h-24`}
                  onChange={(event) => setMoveOutNote(event.target.value)}
                  placeholder="Ghi chú kết thúc thuê"
                  value={moveOutNote}
                />
                <button className={adminButtonSecondary} disabled={isSaving} onClick={handleMoveOut} type="button">
                  Kết thúc thuê và mở lại phòng
                </button>
              </div>
            </AdminPanel>
          ) : null}

          <AdminPanel title="Timeline">
            <div className="space-y-4">
              <TimelineItem label="Yêu cầu được tạo" value={formatAdminDate(lead.created_at)} />
              <TimelineItem label="Lịch xem được xác nhận" value={formatAdminDate(lead.appointment_confirmed_at)} />
              <TimelineItem label="Cập nhật gần nhất" value={formatAdminDate(lead.updated_at)} />
              <TimelineItem label="Chuyển vào" value={formatAdminDate(lead.moved_in_at)} />
            </div>
          </AdminPanel>
        </div>
      </section>
    </div>
  );
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ContactLine({ icon, value }: Readonly<{ icon: ReactNode; value: string }>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function Info({
  customValue,
  label,
  value,
}: Readonly<{
  customValue?: ReactNode;
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-lg bg-surface-container-low p-4">
      <p className="text-xs uppercase text-secondary">{label}</p>
      <div className="mt-2 font-semibold text-primary">{customValue ?? value}</div>
    </div>
  );
}

function TimelineItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex gap-4">
      <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
      <div>
        <p className="font-semibold text-primary">{label}</p>
        <p className="mt-1 text-sm text-secondary">{value}</p>
      </div>
    </div>
  );
}

function timeSlotLabel(value: string) {
  return (
    {
      morning: "Buổi sáng",
      afternoon: "Buổi chiều",
      evening: "Buổi tối",
      "": "Chưa chọn",
    }[value] ?? value
  );
}
