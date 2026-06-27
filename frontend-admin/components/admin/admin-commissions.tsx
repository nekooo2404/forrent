"use client";

import { CircleDollarSign, RefreshCw, TrendingUp, UsersRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";

import {
  adminMessageFrom,
  adminRequest,
  formatAdminDateOnly,
  formatAdminVnd,
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
} from "./admin-ui";

export function AdminCommissions() {
  const { token } = useAdminAuth();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary() {
    setIsLoading(true);
    setError("");
    try {
      const data = await adminRequest<CommissionSummary>("commissions/summary", token);
      setSummary(data);
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
        <AdminInlineMessage error={error} />
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          caption="Tổng hoa hồng từ các lead chưa bị hủy"
          icon={<WalletCards size={20} strokeWidth={1.8} />}
          label="Dự kiến"
          value={formatAdminVnd(summary?.total_estimated_commission ?? 0)}
        />
        <AdminStatCard
          caption="Đã tính vào doanh thu hoa hồng"
          icon={<CircleDollarSign size={20} strokeWidth={1.8} />}
          label="Đã nhận"
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
                    <th className="py-3 text-right font-semibold">Đã nhận</th>
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
                    <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-secondary">{item.lead_count} lead</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metric label="Dự kiến" value={formatAdminVnd(item.total_estimated_commission ?? 0)} />
                    <Metric label="Đã nhận" value={formatAdminVnd(item.total_received_commission ?? 0)} />
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

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md bg-white p-3">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-primary">{value}</p>
    </div>
  );
}
