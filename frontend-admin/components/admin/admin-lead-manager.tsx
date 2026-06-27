"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, MessageSquareText, RefreshCw, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  adminList,
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

const leadStatuses = [
  { label: "Tất cả", value: "" },
  { label: "Lead mới", value: "NEW" },
  { label: "Đã liên hệ", value: "CONTACTED" },
  { label: "Đã xem phòng", value: "VIEWED" },
  { label: "Đã chuyển vào", value: "MOVED_IN" },
  { label: "Không chuyển vào", value: "NOT_MOVED_IN" },
  { label: "Đã hủy", value: "CANCELLED" },
];

export function AdminLeadManager() {
  const { token } = useAdminAuth();
  const [leads, setLeads] = useState<AdminViewingRequest[]>([]);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedLead, setSelectedLead] = useState<AdminViewingRequest | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("NEW");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadLeads(nextSearch = search, nextStatus = status) {
    setIsLoading(true);
    setError("");
    try {
      const response = await adminList<AdminViewingRequest>("viewing-requests", token, {
        ordering: "-created_at",
        page_size: 50,
        search: nextSearch,
        status: nextStatus,
      });
      setLeads(response.results);
      setCount(response.count);
      if (selectedLead) {
        const refreshed = response.results.find((lead) => lead.id === selectedLead.id);
        if (refreshed) setSelectedLead(refreshed);
      }
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải danh sách lead."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLeads("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const statusCounts = useMemo(() => {
    return leads.reduce<Record<string, number>>((accumulator, lead) => {
      accumulator[lead.status] = (accumulator[lead.status] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [leads]);

  function selectLead(lead: AdminViewingRequest) {
    setSelectedLead(lead);
    setNoteDraft(lead.saler_note ?? "");
    setStatusDraft(lead.status);
    setMessage("");
    setError("");
  }

  async function handleUpdateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLead) return;
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const updated = await adminRequest<AdminViewingRequest>(`viewing-requests/${selectedLead.id}`, token, {
        body: JSON.stringify({
          saler_note: noteDraft,
          status: statusDraft,
        }),
        method: "PATCH",
      });
      setSelectedLead(updated);
      setLeads((current) => current.map((lead) => (lead.id === updated.id ? updated : lead)));
      setMessage("Lead đã được cập nhật.");
    } catch (updateError) {
      setError(adminMessageFrom(updateError, "Không thể cập nhật lead."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmMovedIn() {
    if (!selectedLead) return;
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await adminRequest<Record<string, unknown>>(`viewing-requests/${selectedLead.id}/confirm-moved-in`, token, {
        method: "POST",
      });
      setMessage("Lead đã được xác nhận chuyển vào và hoa hồng đã được ghi nhận.");
      await loadLeads();
    } catch (confirmError) {
      setError(adminMessageFrom(confirmError, "Không thể xác nhận chuyển vào."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <button className={adminButtonSecondary} onClick={() => loadLeads()} type="button">
            <RefreshCw size={16} strokeWidth={1.8} />
            Làm mới
          </button>
        }
        eyebrow="Lead operations"
        subtitle="Theo dõi yêu cầu xem phòng, cập nhật trạng thái xử lý và xác nhận chuyển vào để backend tự ghi nhận hoa hồng."
        title="Quản lý Lead xem phòng"
      />

      <div className="mb-5 space-y-3">
        <AdminInlineMessage error={error} message={message} />
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          ["NEW", "Lead mới"],
          ["CONTACTED", "Đã liên hệ"],
          ["VIEWED", "Đã xem"],
          ["MOVED_IN", "Chuyển vào"],
        ].map(([key, label]) => (
          <button
            className="rounded-xl border border-primary/10 bg-white/90 p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/25"
            key={key}
            onClick={() => {
              setStatus(key);
              loadLeads(search, key);
            }}
            type="button"
          >
            <span className="text-sm text-secondary">{label}</span>
            <span className="mt-2 block text-3xl font-semibold tabular-nums text-primary">{statusCounts[key] ?? 0}</span>
          </button>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <AdminPanel
          toolbar={
            <form
              className="grid w-full gap-3 md:grid-cols-[minmax(240px,1fr)_190px_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                loadLeads(search, status);
              }}
            >
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={17} strokeWidth={1.8} />
                <input
                  className={`${adminInputClass} pl-9`}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm khách hàng, email, số điện thoại..."
                  type="search"
                  value={search}
                />
              </label>
              <select className={adminSelectClass} onChange={(event) => setStatus(event.target.value)} value={status}>
                {leadStatuses.map((item) => (
                  <option key={item.value || "all"} value={item.value}>{item.label}</option>
                ))}
              </select>
              <button className={adminButtonSecondary} type="submit">Lọc</button>
            </form>
          }
          title={`Danh sách lead (${count})`}
        >
          {isLoading ? (
            <AdminLoadingState />
          ) : leads.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-primary/10 text-xs uppercase tracking-[0.16em] text-secondary">
                  <tr>
                    <th className="py-3 pr-5 font-semibold">Khách hàng</th>
                    <th className="py-3 pr-5 font-semibold">Phòng</th>
                    <th className="py-3 pr-5 font-semibold">Lịch xem</th>
                    <th className="py-3 pr-5 font-semibold">Hoa hồng</th>
                    <th className="py-3 pr-5 font-semibold">Trạng thái</th>
                    <th className="py-3 text-right font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {leads.map((lead) => (
                    <tr
                      className={`cursor-pointer transition hover:bg-surface-container-low/70 ${selectedLead?.id === lead.id ? "bg-surface-container-low" : ""}`}
                      key={lead.id}
                      onClick={() => selectLead(lead)}
                    >
                      <td className="py-4 pr-5">
                        <p className="font-semibold text-primary">{lead.full_name}</p>
                        <p className="mt-1 text-xs text-secondary">{lead.phone}</p>
                      </td>
                      <td className="max-w-[260px] py-4 pr-5">
                        <p className="line-clamp-1 font-medium text-primary">{lead.room_title}</p>
                        <p className="mt-1 text-xs text-secondary">{lead.ward_name}, {lead.city_name}</p>
                      </td>
                      <td className="py-4 pr-5 text-secondary">
                        <p>{formatAdminDateOnly(lead.preferred_viewing_date)}</p>
                        <p className="mt-1 text-xs">{timeSlotLabel(lead.preferred_viewing_time_slot)}</p>
                      </td>
                      <td className="py-4 pr-5 tabular-nums text-primary">{formatAdminVnd(lead.estimated_commission_amount)}</td>
                      <td className="py-4 pr-5">
                        <AdminLeadBadge status={lead.status} />
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          className="inline-flex items-center gap-1 font-semibold text-primary transition hover:text-secondary"
                          href={`/admin/leads/${lead.id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          Mở
                          <ArrowUpRight size={14} strokeWidth={1.8} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState description="Không có lead phù hợp với bộ lọc hiện tại." title="Chưa có lead" />
          )}
        </AdminPanel>

        <AdminPanel title="Cập nhật nhanh">
          {selectedLead ? (
            <form className="space-y-5" onSubmit={handleUpdateLead}>
              <div className="rounded-lg bg-surface-container-low p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-secondary">Lead #{selectedLead.id}</p>
                <h3 className="mt-1 font-headline-sm text-2xl text-primary">{selectedLead.full_name}</h3>
                <p className="mt-2 text-sm text-secondary">{selectedLead.email} · {selectedLead.phone}</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-primary">{selectedLead.room_title}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Tạo lúc" value={formatAdminDate(selectedLead.created_at)} />
                  <Info label="Lịch xem" value={formatAdminDateOnly(selectedLead.preferred_viewing_date)} />
                  <Info label="Hoa hồng dự kiến" value={formatAdminVnd(selectedLead.estimated_commission_amount)} />
                  <Info label="Đã ghi nhận" value={formatAdminVnd(selectedLead.actual_commission_amount)} />
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Trạng thái</span>
                <select className={adminSelectClass} onChange={(event) => setStatusDraft(event.target.value)} value={statusDraft}>
                  {leadStatuses.filter((item) => item.value).map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                  <MessageSquareText size={14} strokeWidth={1.8} />
                  Ghi chú saler
                </span>
                <textarea className={`${adminInputClass} min-h-32`} onChange={(event) => setNoteDraft(event.target.value)} value={noteDraft} />
              </label>

              <div className="grid gap-3">
                <button className={adminButtonPrimary} disabled={isSaving} type="submit">
                  {isSaving ? "Đang lưu..." : "Lưu cập nhật"}
                </button>
                <button
                  className={adminButtonSecondary}
                  disabled={isSaving || selectedLead.status === "MOVED_IN"}
                  onClick={handleConfirmMovedIn}
                  type="button"
                >
                  <CheckCircle2 size={16} strokeWidth={1.8} />
                  Xác nhận chuyển vào
                </button>
              </div>
            </form>
          ) : (
            <AdminEmptyState description="Chọn một lead trong bảng để cập nhật trạng thái, ghi chú hoặc xác nhận chuyển vào." title="Chưa chọn lead" />
          )}
        </AdminPanel>
      </section>
    </div>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-1 font-medium text-primary">{value}</p>
    </div>
  );
}

function timeSlotLabel(value: string) {
  return (
    {
      morning: "Buổi sáng",
      afternoon: "Buổi chiều",
      evening: "Buổi tối",
      "": "Chưa chọn khung giờ",
    }[value] ?? value
  );
}
