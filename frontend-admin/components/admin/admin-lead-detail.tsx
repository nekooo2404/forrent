"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Mail, MapPin, Phone, UserRound } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  adminMessageFrom,
  adminRequest,
  formatAdminDate,
  formatAdminDateOnly,
  formatAdminVnd,
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
  { label: "Lead mới", value: "NEW" },
  { label: "Đã liên hệ", value: "CONTACTED" },
  { label: "Đã xem phòng", value: "VIEWED" },
  { label: "Đã chuyển vào", value: "MOVED_IN" },
  { label: "Không chuyển vào", value: "NOT_MOVED_IN" },
  { label: "Đã hủy", value: "CANCELLED" },
];

export function AdminLeadDetail({ id }: Readonly<{ id: string }>) {
  const { token } = useAdminAuth();
  const [lead, setLead] = useState<AdminViewingRequest | null>(null);
  const [status, setStatus] = useState("NEW");
  const [note, setNote] = useState("");
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
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải chi tiết lead."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLead();
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
        body: JSON.stringify({ saler_note: note, status }),
        method: "PATCH",
      });
      setLead(updated);
      setMessage("Lead đã được cập nhật.");
    } catch (updateError) {
      setError(adminMessageFrom(updateError, "Không thể cập nhật lead."));
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

  if (isLoading) {
    return <AdminLoadingState label="Đang tải chi tiết lead..." />;
  }

  if (!lead) {
    return (
      <>
        <AdminInlineMessage error={error} />
        <AdminEmptyState
          action={<Link className={adminButtonSecondary} href="/admin/leads">Quay lại danh sách</Link>}
          description="Lead này có thể đã bị xóa hoặc tài khoản không có quyền xem."
          title="Không tìm thấy lead"
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
            Danh sách lead
          </Link>
        }
        eyebrow={`Lead #${lead.id}`}
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
                <h2 className="font-headline-sm text-2xl text-primary">{lead.full_name}</h2>
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
                <p className="text-xs uppercase tracking-[0.18em] text-secondary">Room</p>
                <p className="mt-1 font-headline-sm text-2xl text-primary">{lead.room_title}</p>
              </div>
              <ContactLine icon={<MapPin size={16} strokeWidth={1.8} />} value={`${lead.ward_name}, ${lead.city_name}`} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Ngày xem mong muốn" value={formatAdminDateOnly(lead.preferred_viewing_date)} />
                <Info label="Khung giờ" value={timeSlotLabel(lead.preferred_viewing_time_slot)} />
                <Info label="Tạo lúc" value={formatAdminDate(lead.created_at)} />
                <Info label="Xác nhận lúc" value={formatAdminDate(lead.confirmed_at)} />
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
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Cập nhật trạng thái</span>
                <select className={adminSelectClass} onChange={(event) => setStatus(event.target.value)} value={status}>
                  {statuses.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Ghi chú saler</span>
                <textarea className={`${adminInputClass} min-h-40`} onChange={(event) => setNote(event.target.value)} value={note} />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className={adminButtonPrimary} disabled={isSaving} type="submit">
                  {isSaving ? "Đang lưu..." : "Lưu cập nhật"}
                </button>
                <button
                  className={adminButtonSecondary}
                  disabled={isSaving || lead.status === "MOVED_IN"}
                  onClick={handleConfirmMovedIn}
                  type="button"
                >
                  <CheckCircle2 size={16} strokeWidth={1.8} />
                  Xác nhận chuyển vào
                </button>
              </div>
            </form>
          </AdminPanel>

          <AdminPanel title="Timeline">
            <div className="space-y-4">
              <TimelineItem label="Lead được tạo" value={formatAdminDate(lead.created_at)} />
              <TimelineItem label="Yêu cầu xem phòng xác nhận" value={formatAdminDate(lead.confirmed_at)} />
              <TimelineItem label="Cập nhật gần nhất" value={formatAdminDate(lead.updated_at)} />
              <TimelineItem label="Chuyển vào" value={formatAdminDate(lead.moved_in_at)} />
            </div>
          </AdminPanel>
        </div>
      </section>
    </div>
  );
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
      <p className="text-xs uppercase tracking-[0.16em] text-secondary">{label}</p>
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
