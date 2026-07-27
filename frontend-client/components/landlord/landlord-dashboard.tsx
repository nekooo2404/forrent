"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarCheck, Clock3, DoorOpen, RefreshCw, WalletCards } from "@/components/ui/icons";

import {
  formatLandlordVnd,
  landlordRequest,
  type LandlordCommissionSummary,
  type LandlordViewingRequest,
} from "./landlord-api";
import { LandlordLoadState, LandlordPageHeader, landlordPrimaryButton, landlordSecondaryButton } from "./landlord-portal-ui";
import { LandlordAccessState } from "./landlord-room-shared";
import type { LandlordRoom, LandlordRoomSummary } from "./landlord-room-types";

type RentalOperatorDashboard = {
  room_summary: LandlordRoomSummary;
  new_request_count: number;
  today_appointment_count: number;
  incomplete_room_count: number;
  new_requests: LandlordViewingRequest[];
  today_appointments: LandlordViewingRequest[];
  incomplete_rooms: LandlordRoom[];
  commission: Pick<LandlordCommissionSummary, "pending" | "pending_amount"> | null;
};

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function missingRoomReason(room: LandlordRoom) {
  if (!room.title.trim()) return "thiếu tên phòng";
  if (!room.address.trim()) return "thiếu địa chỉ";
  if (!Number(room.price)) return "chưa có giá thuê";
  if (!room.images?.length && !room.thumbnail) return "chưa có ảnh hoặc video";
  if (!room.description.trim()) return "thiếu mô tả";
  return null;
}

export function LandlordDashboard() {
  const [summary, setSummary] = useState<LandlordRoomSummary | null>(null);
  const [rooms, setRooms] = useState<LandlordRoom[]>([]);
  const [requests, setRequests] = useState<LandlordViewingRequest[]>([]);
  const [commission, setCommission] = useState<Pick<LandlordCommissionSummary, "pending" | "pending_amount"> | null>(null);
  const [queueCounts, setQueueCounts] = useState({ incomplete: 0, newRequests: 0, todayAppointments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<"loading" | "ready" | "forbidden">("loading");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const dashboard = await landlordRequest<RentalOperatorDashboard>("rooms/dashboard");
      setSummary(dashboard.room_summary);
      setRooms(dashboard.incomplete_rooms);
      setRequests([...dashboard.new_requests, ...dashboard.today_appointments]);
      setCommission(dashboard.commission);
      setQueueCounts({
        incomplete: dashboard.incomplete_room_count,
        newRequests: dashboard.new_request_count,
        todayAppointments: dashboard.today_appointment_count,
      });
      setAccess("ready");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Không thể tải khu vực quản lý cho thuê.";
      if (/đăng nhập|quyền|tài khoản|session|401|403/i.test(message)) setAccess("forbidden");
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const newRequests = useMemo(() => requests.filter((item) => item.status === "NEW"), [requests]);
  const todayAppointments = useMemo(() => requests.filter((item) => item.appointment_date === localDateKey()), [requests]);
  const incompleteRooms = useMemo(
    () => rooms.filter((room) => ["DRAFT", "HIDDEN"].includes(room.status) && missingRoomReason(room)).slice(0, 6),
    [rooms],
  );

  if (access === "forbidden" && !loading) {
    return <LandlordAccessState actionHref="/log-in" actionLabel="Đăng nhập" description="Đăng nhập bằng tài khoản người cho thuê để theo dõi phòng, lịch hẹn và yêu cầu tư vấn." title="Bạn cần đăng nhập" />;
  }

  return (
    <section className="px-margin-mobile py-10 md:px-margin-desktop md:py-12">
      <div className="mx-auto max-w-container-max">
        <LandlordPageHeader
          actions={(
            <button className={landlordSecondaryButton} onClick={() => void loadDashboard()} type="button">
              <RefreshCw aria-hidden="true" size={18} /> Làm mới
            </button>
          )}
          description="Tập trung vào những việc giúp phòng được cập nhật, khách được phản hồi và lịch xem diễn ra đúng hẹn."
          title="Việc cần xử lý"
        />

        {loading || error ? <div className="mt-6"><LandlordLoadState error={error} loading={loading} onRetry={() => void loadDashboard()} /></div> : null}

        {!loading && !error && summary ? (
          <>
            <div className="mt-6 grid gap-3 border-y border-outline-variant/70 py-4 sm:grid-cols-2">
              <Link className="group flex items-center justify-between gap-4 rounded-md bg-surface-container-low px-4 py-4" href="/landlord/rooms?status=PUBLISHED">
                <span className="flex items-center gap-3"><DoorOpen aria-hidden="true" className="text-primary" size={21} /><span><span className="block text-sm text-on-surface-variant">Phòng đang hiển thị</span><strong className="mt-1 block text-2xl tabular-nums text-on-surface">{summary.published}</strong></span></span>
                <span className="text-sm font-semibold text-primary group-hover:underline">Xem phòng</span>
              </Link>
              <Link className="group flex items-center justify-between gap-4 rounded-md bg-surface-container-low px-4 py-4" href="/landlord/viewing-requests?status=NEW">
                <span className="flex items-center gap-3"><Clock3 aria-hidden="true" className="text-primary" size={21} /><span><span className="block text-sm text-on-surface-variant">Yêu cầu mới</span><strong className="mt-1 block text-2xl tabular-nums text-on-surface">{newRequests.length}</strong></span></span>
                <span className="text-sm font-semibold text-primary group-hover:underline">Phản hồi</span>
              </Link>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
              <div>
                <div className="flex items-end justify-between gap-4 border-b border-outline-variant/70 pb-4">
                  <div><h3 className="font-headline-sm text-2xl text-on-surface">Hàng đợi công việc</h3><p className="mt-1 text-sm text-on-surface-variant">Mở đúng danh sách để xử lý ngay, không cần tìm lại.</p></div>
                <span className="text-sm tabular-nums text-on-surface-variant">{queueCounts.newRequests + queueCounts.todayAppointments + queueCounts.incomplete} việc</span>
                </div>
                <div className="divide-y divide-outline-variant/70">
                  <WorkQueueRow icon={<Clock3 size={20} />} title={`${queueCounts.newRequests} yêu cầu mới`} description={newRequests.length ? `Khách đang chờ bạn liên hệ về ${newRequests[0].room_title}.` : "Không có yêu cầu mới cần phản hồi."} href="/landlord/viewing-requests?status=NEW" action="Xem yêu cầu" tone={queueCounts.newRequests ? "primary" : "neutral"} />
                  <WorkQueueRow icon={<CalendarCheck size={20} />} title={`${queueCounts.todayAppointments} lịch xem hôm nay`} description={todayAppointments.length ? `${todayAppointments[0].full_name} · ${todayAppointments[0].room_code}` : "Chưa có lịch xem phòng hôm nay."} href="/landlord/calendar" action="Mở lịch" tone={queueCounts.todayAppointments ? "primary" : "neutral"} />
                  <WorkQueueRow icon={<DoorOpen size={20} />} title={`${queueCounts.incomplete} phòng cần bổ sung`} description={incompleteRooms.length ? `${incompleteRooms[0].public_title || incompleteRooms[0].title}: ${missingRoomReason(incompleteRooms[0])}.` : "Thông tin các phòng đang được cập nhật đầy đủ."} href="/landlord/rooms?status=DRAFT" action="Cập nhật phòng" tone={queueCounts.incomplete ? "primary" : "neutral"} />
                  {commission ? <WorkQueueRow icon={<WalletCards size={20} />} title={`${commission.pending} khoản hoa hồng chờ xử lý`} description={commission.pending ? `Tổng đang chờ: ${formatLandlordVnd(commission.pending_amount)}.` : "Không có khoản hoa hồng đang chờ đối soát."} href="/landlord/commissions" action="Xem đối soát" tone={commission.pending ? "primary" : "neutral"} /> : null}
                </div>
              </div>
              <aside className="border border-outline-variant/70 bg-surface-container-lowest p-5">
                <h3 className="font-headline-sm text-xl text-on-surface">Trạng thái danh mục</h3>
                <dl className="mt-4 divide-y divide-outline-variant/70 text-sm">
                  <SummaryRow label="Tổng phòng" value={summary.total} />
                  <SummaryRow label="Bản nháp" value={summary.draft} />
                  <SummaryRow label="Đã ẩn" value={summary.hidden} />
                  <SummaryRow label="Đã cho thuê" value={summary.rented} />
                </dl>
                <Link className={`${landlordPrimaryButton} mt-5 w-full`} href="/landlord/rooms"><DoorOpen aria-hidden="true" size={18} /> Quản lý phòng</Link>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function WorkQueueRow({ action, description, href, icon, title, tone }: Readonly<{ action: string; description: string; href: string; icon: ReactNode; title: string; tone: "primary" | "neutral" }>) {
  return <article className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="mt-0.5 text-primary">{icon}</span><div><h4 className="font-semibold text-on-surface">{title}</h4><p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p></div></div><Link className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold sm:shrink-0 ${tone === "primary" ? "bg-primary text-on-primary" : "border border-outline-variant/70 text-on-surface"}`} href={href}>{action}</Link></article>;
}

function SummaryRow({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="flex items-center justify-between gap-4 py-3"><dt className="text-on-surface-variant">{label}</dt><dd className="font-semibold tabular-nums text-on-surface">{value}</dd></div>;
}
