"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { CircleDollarSign, RefreshCw, WalletCards } from "@/components/ui/icons";

import {
  formatLandlordDateTime,
  formatLandlordVnd,
  landlordRequest,
  type LandlordCommission,
  type LandlordCommissionSummary,
  type LandlordPaginated,
} from "./landlord-api";
import { LandlordLoadState, LandlordPageHeader, landlordSecondaryButton } from "./landlord-portal-ui";

const payoutLabels: Record<LandlordCommission["status"], string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

const payoutTones: Record<LandlordCommission["status"], string> = {
  PENDING: "bg-warning-container text-on-surface",
  APPROVED: "bg-primary-container text-on-primary-container",
  PAID: "bg-success-container text-on-surface",
  CANCELLED: "bg-surface-container-high text-on-surface-variant",
};

export function LandlordCommissions() {
  const [summary, setSummary] = useState<LandlordCommissionSummary | null>(null);
  const [payouts, setPayouts] = useState<LandlordCommission[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCommissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, payoutData] = await Promise.all([
        landlordRequest<LandlordCommissionSummary>("commissions/summary"),
        landlordRequest<LandlordPaginated<LandlordCommission>>(`commissions?ordering=-created_at&page=${page}&page_size=25`),
      ]);
      setSummary(summaryData);
      setPayouts(payoutData.results);
      setCount(payoutData.count);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Không thể tải dữ liệu hoa hồng.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(count / 25));

  useEffect(() => {
    void loadCommissions();
  }, [loadCommissions]);

  return (
    <section className="px-margin-mobile py-10 md:px-margin-desktop md:py-12">
      <div className="mx-auto max-w-container-max">
        <LandlordPageHeader
          actions={(
            <button className={landlordSecondaryButton} onClick={() => void loadCommissions()} type="button">
              <RefreshCw aria-hidden="true" size={18} />Làm mới
            </button>
          )}
          description="Theo dõi khoản hoa hồng phát sinh từ khách đã thuê phòng. ForRent chịu trách nhiệm duyệt và cập nhật thanh toán."
          title="Hoa hồng"
        />

        {loading || error ? (
          <div className="mt-6"><LandlordLoadState error={error} loading={loading} onRetry={() => void loadCommissions()} /></div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 border-y border-outline-variant/70 py-4 sm:grid-cols-2">
              <MoneyMetric icon={<WalletCards size={20} />} label={`Đang chờ · ${summary?.pending ?? 0} khoản`} value={formatLandlordVnd(summary?.pending_amount ?? 0)} />
              <MoneyMetric icon={<CircleDollarSign size={20} />} label={`Đã thanh toán · ${summary?.paid ?? 0} khoản`} value={formatLandlordVnd(summary?.paid_amount ?? 0)} />
            </div>

            <div className="mt-8 border-y border-outline-variant/70">
              {payouts.length ? payouts.map((payout) => (
                <article className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_11rem_11rem] md:items-center" key={payout.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-on-surface">{payout.room_title}</h3>
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${payoutTones[payout.status]}`}>{payoutLabels[payout.status]}</span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">{payout.room_code} · Khách {payout.tenant_name}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">Ghi nhận {formatLandlordDateTime(payout.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-on-surface-variant">Hoa hồng</p>
                    <p className="mt-1 font-semibold tabular-nums text-primary">{formatLandlordVnd(payout.amount)}</p>
                  </div>
                  <p className="text-sm text-on-surface-variant md:text-right">
                    {payout.paid_at ? `Thanh toán ${formatLandlordDateTime(payout.paid_at)}` : payout.approved_at ? `Duyệt ${formatLandlordDateTime(payout.approved_at)}` : "Đang chờ ForRent xử lý"}
                  </p>
                </article>
              )) : (
                <div className="py-14 text-center">
                  <h3 className="font-headline-sm text-xl text-on-surface">Chưa có khoản hoa hồng</h3>
                  <p className="mt-2 text-on-surface-variant">Khoản hoa hồng sẽ xuất hiện sau khi bạn xác nhận khách đã thuê phòng.</p>
                </div>
              )}
            </div>
            {totalPages > 1 ? (
              <nav aria-label="Phân trang hoa hồng" className="mt-5 flex items-center justify-between gap-3">
                <p className="text-sm text-on-surface-variant">Trang {page}/{totalPages} · {count} khoản</p>
                <div className="flex gap-2">
                  <button className={landlordSecondaryButton} disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} type="button">Trang trước</button>
                  <button className={landlordSecondaryButton} disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} type="button">Trang sau</button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function MoneyMetric({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-3 border-l-2 border-primary bg-surface-container-low px-4 py-4">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-sm text-on-surface-variant">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-on-surface">{value}</p>
      </div>
    </div>
  );
}
