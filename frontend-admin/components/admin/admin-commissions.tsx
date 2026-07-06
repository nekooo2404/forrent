"use client";

import { CircleDollarSign, RefreshCw, TrendingUp, UsersRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";

import {
  adminMessageFrom,
  adminList,
  adminRequest,
  formatAdminDateOnly,
  formatAdminVnd,
  payoutStatusLabel,
  payoutStatusTone,
  type CommissionPayout,
  type CommissionSummary,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminEmptyState,
  AdminInlineMessage,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  adminButtonSecondary,
  adminSelectClass,
} from "./admin-ui";

export function AdminCommissions() {
  const { token } = useAdminAuth();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cancelNotes, setCancelNotes] = useState<Record<number, string>>({});

  async function loadSummary() {
    setIsLoading(true);
    setError("");
    try {
      const [summaryData, payoutData] = await Promise.all([
        adminRequest<CommissionSummary>("commissions/summary", token),
        adminList<CommissionPayout>("commissions/payouts", token, { ordering: "-created_at", page_size: 50 }),
      ]);
      setSummary(summaryData);
      setPayouts(payoutData.results);
    } catch (loadError) {
      setError(adminMessageFrom(loadError, "Không thể tải dữ liệu hoa hồng."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function updatePayoutStatus(payout: CommissionPayout, status: string) {
    const note = cancelNotes[payout.id]?.trim() || payout.note;
    if (status === "CANCELLED" && !note) {
      setError("Cần nhập lý do hủy payout.");
      return;
    }
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await adminRequest<CommissionPayout>(`commissions/payouts/${payout.id}`, token, {
        body: JSON.stringify(status === "CANCELLED" ? { note, status } : { status }),
        method: "PATCH",
      });
      setMessage("Trạng thái payout đã được cập nhật.");
      await loadSummary();
    } catch (saveError) {
      setError(adminMessageFrom(saveError, "Không thể cập nhật payout."));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <AdminLoadingState label="Đang tải hoa hồng..." />;
  }

  return (
    <div>
      <AdminPageHeader
        actions={
          <button className={adminButtonSecondary} onClick={loadSummary} type="button">
            <RefreshCw size={16} strokeWidth={1.8} />
            Làm mới
          </button>
        }
        eyebrow="Commission control"
        subtitle="Tổng hợp hoa hồng dự kiến và đã ghi nhận từ lead xem phòng. Backend chỉ ghi nhận hoa hồng khi lead được xác nhận đã chuyển vào."
        title="Hoa hồng"
      />

      <div className="mb-5">
        <AdminInlineMessage error={error} message={message} />
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          caption="Tổng hoa hồng từ các lead chưa bị hủy"
          icon={<WalletCards size={20} strokeWidth={1.8} />}
          label="Dự kiến"
          value={formatAdminVnd(summary?.total_estimated_commission ?? 0)}
        />
        <AdminStatCard
          caption="Đã ghi nhận khi lead chuyển vào"
          icon={<CircleDollarSign size={20} strokeWidth={1.8} />}
          label="Đã ghi nhận"
          value={formatAdminVnd(summary?.total_received_commission ?? 0)}
        />
        <AdminStatCard
          caption="Lead đã được xác nhận chuyển vào"
          icon={<UsersRound size={20} strokeWidth={1.8} />}
          label="Đã chuyển vào"
          value={summary?.total_moved_in_leads ?? 0}
        />
        <AdminStatCard
          caption="Lead đang trong pipeline xử lý"
          icon={<TrendingUp size={20} strokeWidth={1.8} />}
          label="Đang xử lý"
          value={summary?.total_pending_leads ?? 0}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminPanel title="Payout cần xử lý">
          {payouts.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-primary/10 text-xs uppercase tracking-[0.16em] text-secondary">
                  <tr>
                    <th className="py-3 pr-5 font-semibold">Lead</th>
                    <th className="py-3 pr-5 font-semibold">Phòng</th>
                    <th className="py-3 pr-5 font-semibold">Số tiền</th>
                    <th className="py-3 pr-5 font-semibold">Trạng thái</th>
                    <th className="py-3 text-right font-semibold">Cập nhật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {payouts.map((payout) => (
                    <tr className="transition hover:bg-surface-container-low/70" key={payout.id}>
                      <td className="py-4 pr-5">
                        <p className="font-semibold text-primary">{payout.tenant_name}</p>
                        <p className="mt-1 text-xs text-secondary">Lead #{payout.viewing_request}</p>
                      </td>
                      <td className="py-4 pr-5 text-secondary">{payout.room_title}</td>
                      <td className="py-4 pr-5 tabular-nums text-primary">{formatAdminVnd(payout.amount)}</td>
                      <td className="py-4 pr-5">
                        <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${payoutStatusTone(payout.status)}`}>
                          {payoutStatusLabel(payout.status)}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {payout.status !== "PAID" && payout.status !== "CANCELLED" ? (
                          <input
                            className="mb-2 w-full rounded-md border border-primary/10 bg-surface-container-lowest px-3 py-2 text-xs text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                            onChange={(event) => setCancelNotes((current) => ({ ...current, [payout.id]: event.target.value }))}
                            placeholder="Lý do hủy nếu chọn hủy"
                            value={cancelNotes[payout.id] ?? payout.note ?? ""}
                          />
                        ) : null}
                        <select
                          className={adminSelectClass}
                          disabled={isSaving || payout.status === "PAID" || payout.status === "CANCELLED"}
                          onChange={(event) => updatePayoutStatus(payout, event.target.value)}
                          value={payout.status}
                        >
                          {payoutOptions(payout.status).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {payout.paid_at ? <p className="mt-1 text-xs text-secondary">Trả lúc {formatAdminDateOnly(payout.paid_at)}</p> : null}
                        {payout.cancelled_at ? <p className="mt-1 text-xs text-secondary">Hủy lúc {formatAdminDateOnly(payout.cancelled_at)}</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState description="Khi lead được xác nhận chuyển vào, payout PENDING sẽ xuất hiện tại đây." title="Chưa có payout" />
          )}
        </AdminPanel>

        <AdminPanel title="Theo phòng">
          {summary?.by_room?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-primary/10 text-xs uppercase tracking-[0.16em] text-secondary">
                  <tr>
                    <th className="py-3 pr-5 font-semibold">Phòng</th>
                    <th className="py-3 pr-5 font-semibold">Lead</th>
                    <th className="py-3 pr-5 font-semibold">Đã chuyển vào</th>
                    <th className="py-3 pr-5 font-semibold">Dự kiến</th>
                    <th className="py-3 text-right font-semibold">Đã ghi nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {summary.by_room.map((item) => (
                    <tr className="transition hover:bg-surface-container-low/70" key={item.room_id}>
                      <td className="py-4 pr-5 font-semibold text-primary">{item.room__title}</td>
                      <td className="py-4 pr-5 tabular-nums text-secondary">{item.lead_count}</td>
                      <td className="py-4 pr-5 tabular-nums text-secondary">{item.moved_in_count}</td>
                      <td className="py-4 pr-5 tabular-nums text-primary">{formatAdminVnd(item.total_estimated_commission ?? 0)}</td>
                      <td className="py-4 text-right tabular-nums font-semibold text-primary">{formatAdminVnd(item.total_received_commission ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState description="Khi có lead xem phòng, hệ thống sẽ bắt đầu tổng hợp hoa hồng theo từng phòng." title="Chưa có dữ liệu theo phòng" />
          )}
        </AdminPanel>

        <AdminPanel title="Theo tháng">
          {summary?.by_month?.length ? (
            <div className="space-y-4">
              {summary.by_month.map((item) => (
                <div className="rounded-lg bg-surface-container-low p-4" key={item.month ?? "unknown"}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-primary">{formatAdminDateOnly(item.month)}</p>
                    <span className="rounded-md bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-secondary">{item.lead_count} lead</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Dự kiến" value={formatAdminVnd(item.total_estimated_commission ?? 0)} />
                    <Metric label="Đã ghi nhận" value={formatAdminVnd(item.total_received_commission ?? 0)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState description="Báo cáo theo tháng sẽ xuất hiện sau khi có lead đầu tiên." title="Chưa có dữ liệu theo tháng" />
          )}
        </AdminPanel>
      </section>
    </div>
  );
}

function payoutOptions(status: string) {
  if (status === "PENDING") {
    return [
      { label: "Chờ duyệt", value: "PENDING" },
      { label: "Đã duyệt", value: "APPROVED" },
      { label: "Đã hủy", value: "CANCELLED" },
    ];
  }
  if (status === "APPROVED") {
    return [
      { label: "Đã duyệt", value: "APPROVED" },
      { label: "Đã trả", value: "PAID" },
      { label: "Đã hủy", value: "CANCELLED" },
    ];
  }
  return [{ label: payoutStatusLabel(status), value: status }];
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md bg-surface-container-lowest p-3">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-primary">{value}</p>
    </div>
  );
}
