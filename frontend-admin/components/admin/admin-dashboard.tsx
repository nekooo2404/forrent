"use client";

import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, CircleDollarSign, Mail, Newspaper, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

import {
  adminMessageFrom,
  adminRequest,
  formatAdminDate,
  formatAdminVnd,
  type CommissionSummary,
  type DashboardSummary,
} from "./admin-api";
import { useAdminAuth } from "./admin-shell";
import {
  AdminEmptyState,
  AdminInlineMessage,
  AdminLeadBadge,
  AdminLoadingState,
  AdminPageHeader,
  AdminPanel,
  AdminStatCard,
  adminButtonPrimary,
  adminButtonSecondary,
} from "./admin-ui";

type DashboardState = {
  commission: CommissionSummary | null;
  error: string;
  isLoading: boolean;
  summary: DashboardSummary | null;
};

const initialState: DashboardState = {
  commission: null,
  error: "",
  isLoading: true,
  summary: null,
};

export function AdminDashboard() {
  const { token, user } = useAdminAuth();
  const [state, setState] = useState<DashboardState>(initialState);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setState((current) => ({ ...current, error: "", isLoading: true }));
      try {
        const [summary, commission] = await Promise.all([
          adminRequest<DashboardSummary>("dashboard/summary", token),
          adminRequest<CommissionSummary>("commissions/summary", token),
        ]);

        if (!isMounted) return;
        setState({
          commission,
          error: "",
          isLoading: false,
          summary,
        });
      } catch (error) {
        if (!isMounted) return;
        setState((current) => ({
          ...current,
          error: adminMessageFrom(error, "Không thể tải dashboard admin."),
          isLoading: false,
        }));
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [token]);

  if (state.isLoading) {
    return <AdminLoadingState label="Đang tải dashboard..." />;
  }

  const summary = state.summary;
  const commission = state.commission;
  const statusCounts = summary?.status_counts ?? {};
  const totalLeadStatusCount = Math.max(summary?.total_viewing_requests ?? 0, 1);

  return (
    <div>
      <AdminPageHeader
        actions={
          <>
            <Link className={adminButtonSecondary} href="/admin/leads">
              Xem lead
              <ArrowRight size={16} strokeWidth={1.8} />
            </Link>
            <Link className={adminButtonPrimary} href="/admin/rooms">
              Quản lý phòng
              <Building2 size={16} strokeWidth={1.8} />
            </Link>
          </>
        }
        eyebrow={`Xin chào, ${user.full_name}`}
        subtitle="Tổng quan vận hành từ phòng, lead xem phòng, trạng thái hoa hồng và các tác vụ cần xử lý trong ngày."
        title="Tổng quan Dashboard"
      />

      <AdminInlineMessage error={state.error} />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          caption={`${summary?.active_rooms ?? 0} phòng đang mở bán/cho thuê`}
          icon={<Building2 size={20} strokeWidth={1.8} />}
          label="Tổng số phòng"
          value={summary?.total_rooms ?? 0}
        />
        <AdminStatCard
          caption={`${summary?.total_new_leads ?? 0} lead mới đang chờ xử lý`}
          icon={<UsersRound size={20} strokeWidth={1.8} />}
          label="Lead xem phòng"
          value={summary?.total_viewing_requests ?? 0}
        />
        <AdminStatCard
          caption={`${summary?.total_moved_in_leads ?? 0} lead đã chuyển vào`}
          icon={<CircleDollarSign size={20} strokeWidth={1.8} />}
          label="Hoa hồng dự kiến"
          value={formatAdminVnd(summary?.total_estimated_commission ?? 0)}
        />
        <AdminStatCard
          caption="Hoa hồng đã ghi nhận từ lead chuyển vào"
          icon={<Sparkles size={20} strokeWidth={1.8} />}
          label="Hoa hồng đã ghi nhận"
          value={formatAdminVnd(summary?.total_received_commission ?? 0)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <AdminPanel
          title="Lead mới nhất"
          toolbar={
            <Link className="text-sm font-semibold text-secondary transition hover:text-primary" href="/admin/leads">
              Mở bảng lead
            </Link>
          }
        >
          {summary?.latest_leads?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-primary/10 text-xs uppercase tracking-[0.16em] text-secondary">
                  <tr>
                    <th className="py-3 pr-5 font-semibold">Khách hàng</th>
                    <th className="py-3 pr-5 font-semibold">Phòng</th>
                    <th className="py-3 pr-5 font-semibold">Trạng thái</th>
                    <th className="py-3 pr-5 font-semibold">Thời gian</th>
                    <th className="py-3 text-right font-semibold">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {summary.latest_leads.map((lead) => (
                    <tr className="transition hover:bg-surface-container-low/70" key={lead.id}>
                      <td className="py-4 pr-5">
                        <p className="font-semibold text-primary">{lead.full_name}</p>
                        <p className="mt-1 text-xs text-secondary">{lead.phone}</p>
                      </td>
                      <td className="max-w-[240px] py-4 pr-5 text-secondary">
                        <span className="line-clamp-1">{lead.room_title}</span>
                      </td>
                      <td className="py-4 pr-5">
                        <AdminLeadBadge status={lead.status} />
                      </td>
                      <td className="py-4 pr-5 text-secondary">{formatAdminDate(lead.created_at)}</td>
                      <td className="py-4 text-right">
                        <Link className="font-semibold text-primary transition hover:text-secondary" href={`/admin/leads/${lead.id}`}>
                          Mở
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState
              action={<Link className={adminButtonSecondary} href="/admin/rooms">Kiểm tra phòng</Link>}
              description="Khi khách gửi yêu cầu xem phòng, dữ liệu sẽ xuất hiện tại đây cùng trạng thái xử lý."
              title="Chưa có lead mới"
            />
          )}
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel title="Pipeline xử lý">
            <div className="space-y-3">
              {[
                ["NEW", "Lead mới"],
                ["CONTACTED", "Đã liên hệ"],
                ["VIEWED", "Đã xem phòng"],
                ["MOVED_IN", "Đã chuyển vào"],
              ].map(([status, label]) => {
                const count = statusCounts[status] ?? 0;
                return (
                  <div key={status}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-primary">{label}</span>
                      <span className="tabular-nums text-secondary">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (count / totalLeadStatusCount) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminPanel>

          <AdminPanel title="Nội dung & liên hệ">
            <div className="grid gap-3">
              <Link className="group flex items-center justify-between rounded-lg border border-primary/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/25" href="/admin/blogs">
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-md bg-surface-container text-primary">
                    <Newspaper size={18} strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block font-semibold text-primary">Blog Manager</span>
                    <span className="block text-xs text-secondary">Publish bài viết ra public site</span>
                  </span>
                </span>
                <ArrowRight className="text-secondary transition group-hover:translate-x-1 group-hover:text-primary" size={17} strokeWidth={1.8} />
              </Link>
              <Link className="group flex items-center justify-between rounded-lg border border-primary/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/25" href="/admin/contacts">
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-md bg-surface-container text-primary">
                    <Mail size={18} strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block font-semibold text-primary">Contact Inbox</span>
                    <span className="block text-xs text-secondary">Xử lý tin nhắn từ trang liên hệ</span>
                  </span>
                </span>
                <ArrowRight className="text-secondary transition group-hover:translate-x-1 group-hover:text-primary" size={17} strokeWidth={1.8} />
              </Link>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Hoa hồng theo phòng"
            toolbar={
              <Link className="text-sm font-semibold text-secondary transition hover:text-primary" href="/admin/commissions">
                Chi tiết
              </Link>
            }
          >
            {commission?.by_room?.length ? (
              <div className="space-y-4">
                {commission.by_room.slice(0, 5).map((item) => (
                  <div className="flex items-start justify-between gap-4 border-b border-primary/10 pb-4 last:border-0 last:pb-0" key={item.room_id}>
                    <div>
                      <p className="font-semibold text-primary">{item.room__title}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-secondary">
                        <CalendarClock size={14} strokeWidth={1.8} />
                        {item.lead_count} lead · {item.moved_in_count} đã chuyển vào
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatAdminVnd(item.total_received_commission ?? 0)}</p>
                      <p className="mt-1 text-xs text-secondary">đã ghi nhận</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState description="Hoa hồng sẽ được tổng hợp tự động khi lead được xác nhận đã chuyển vào." title="Chưa có dữ liệu hoa hồng" />
            )}
          </AdminPanel>
        </div>
      </section>
    </div>
  );
}
