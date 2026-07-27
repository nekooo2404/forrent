/* eslint-disable @next/next/no-img-element -- Room thumbnails are already transformed by Cloudinary. */

import {
  Archive,
  KeyRound,
  LoaderCircle,
  MoreVertical,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
} from "@/components/ui/icons";
import { formatArea, formatVnd } from "@/lib/api";

import type { LandlordRoom } from "./landlord-room-types";
import { statusCopy } from "./landlord-room-types";

function roomCityName(room: LandlordRoom) {
  return typeof room.city === "object" ? room.city.name : "";
}

function roomWardName(room: LandlordRoom) {
  return typeof room.ward === "object" ? room.ward.name : "";
}

export function LandlordRoomCard({
  isBusy,
  onDelete,
  onEdit,
  onConfirmRental,
  onMoveOut,
  onStatus,
  pendingDelete,
  pendingMoveOut,
  room,
}: Readonly<{
  isBusy: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onConfirmRental: () => void;
  onMoveOut: () => void;
  onStatus: (statusValue: string) => void;
  pendingDelete: boolean;
  pendingMoveOut: boolean;
  room: LandlordRoom;
}>) {
  const status = statusCopy[room.status] ?? statusCopy.DRAFT;
  const canEdit = ["DRAFT", "HIDDEN"].includes(room.status);
  const canPublish = ["DRAFT", "HIDDEN", "PENDING_REVIEW"].includes(room.status);
  const canReturnDraft = ["PENDING_REVIEW", "ARCHIVED"].includes(room.status);
  const canHide = room.status === "PUBLISHED";
  const canArchive = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "HIDDEN"].includes(room.status);
  const statusAllowsDeletion = ["DRAFT", "HIDDEN", "ARCHIVED"].includes(room.status);
  const canDelete = statusAllowsDeletion && room.can_delete;
  const isHistoryProtected = statusAllowsDeletion && !room.can_delete;
  const primaryAction = canEdit
    ? { label: "Sửa phòng", icon: <Pencil size={17} />, onClick: onEdit }
    : canPublish
      ? { label: "Đăng phòng", icon: <Send size={17} />, onClick: () => onStatus("PUBLISHED") }
      : canHide
        ? { label: "Đã cho thuê", icon: <KeyRound size={17} />, onClick: onConfirmRental }
        : canReturnDraft
          ? { label: room.status === "PENDING_REVIEW" ? "Rút về bản nháp" : "Khôi phục bản nháp", icon: <RefreshCw size={17} />, onClick: () => onStatus("DRAFT") }
          : room.status === "RENTED"
            ? { label: pendingMoveOut ? "Xác nhận trả phòng" : "Ghi nhận trả phòng", icon: <KeyRound size={17} />, onClick: onMoveOut }
            : null;
  const thumbnail = room.thumbnail || room.images?.find((image) => image.media_type === "IMAGE")?.image_url || room.images?.[0]?.image_url || "";

  return (
    <article aria-busy={isBusy} className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-[11rem_minmax(0,1fr)_auto] lg:items-start">
        <div className="aspect-[4/3] overflow-hidden rounded-md bg-surface-container-high">
          {thumbnail ? <img alt="Ảnh đại diện phòng" className="h-full w-full object-cover" decoding="async" loading="lazy" src={thumbnail} /> : <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">Chưa có ảnh</div>}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
            <span className="text-sm font-semibold text-tertiary">Mã phòng {room.room_code}</span>
            <span className="text-sm text-on-surface-variant">{room.images?.length ?? 0} ảnh/video</span>
          </div>
          <h3 className="mt-3 text-xl font-semibold leading-snug text-on-surface">{room.public_title || room.title}</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{status.hint}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-semibold text-on-surface">Giá thuê</dt>
              <dd className="mt-1 tabular-nums text-on-surface-variant">{formatVnd(room.price)}/tháng</dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Khu vực</dt>
              <dd className="mt-1 text-on-surface-variant">{roomWardName(room) || roomCityName(room) || "Chưa chọn"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Diện tích</dt>
              <dd className="mt-1 tabular-nums text-on-surface-variant">{formatArea(room.actual_area)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Cọc</dt>
              <dd className="mt-1 tabular-nums text-on-surface-variant">{formatVnd(room.deposit_amount)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 lg:w-44 lg:justify-end">
          {isBusy ? (
            <span className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-on-surface-variant" role="status">
              <LoaderCircle className="animate-spin" size={17} />
              Đang cập nhật
            </span>
          ) : null}
          {primaryAction ? <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-45" disabled={isBusy} onClick={primaryAction.onClick} type="button">{primaryAction.icon}{primaryAction.label}</button> : null}
          <details className="relative w-full">
            <summary className="inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-outline-variant/70 px-3 text-sm font-semibold text-on-surface [&::-webkit-details-marker]:hidden"><MoreVertical aria-hidden="true" size={18} /> Thêm thao tác</summary>
            <div className="absolute right-0 z-10 mt-2 grid min-w-52 gap-1 rounded-md border border-outline-variant/70 bg-surface-container-lowest p-2 shadow-high">
              {canPublish && primaryAction?.label !== "Đăng phòng" ? <ActionButton icon={<Send size={16} />} label="Đăng phòng" onClick={() => onStatus("PUBLISHED")} /> : null}
              {canHide && primaryAction?.label !== "Đã cho thuê" ? <ActionButton icon={<KeyRound size={16} />} label="Đã cho thuê" onClick={onConfirmRental} /> : null}
              {canHide ? <ActionButton icon={<Archive size={16} />} label="Ẩn phòng" onClick={() => onStatus("HIDDEN")} /> : null}
              {canArchive && primaryAction?.label !== "Lưu trữ" ? <ActionButton icon={<Archive size={16} />} label="Lưu trữ" onClick={() => onStatus("ARCHIVED")} /> : null}
              {canDelete ? <ActionButton className="text-error" icon={<Trash2 size={16} />} label={pendingDelete ? "Xác nhận xóa" : "Xóa phòng"} onClick={onDelete} /> : null}
            </div>
          </details>
        </div>
      </div>
      {pendingDelete ? (
        <p className="mt-3 text-right text-sm text-error" id={`delete-room-${room.id}-hint`} role="status">
          Thao tác này không thể hoàn tác. Bấm “Xác nhận xóa” lần nữa để tiếp tục.
        </p>
      ) : null}
      {pendingMoveOut ? (
        <p className="mt-3 text-right text-sm text-error" role="status">
          Xác nhận khách đã trả phòng. Phòng sẽ chuyển sang trạng thái ẩn và chưa tự đăng lại.
        </p>
      ) : null}
      {isHistoryProtected ? (
        <p className="mt-3 text-right text-sm text-on-surface-variant">
          Phòng được giữ lại vì đã có lịch sử xem hoặc thuê.
        </p>
      ) : null}
    </article>
  );
}

function ActionButton({ className = "", icon, label, onClick }: Readonly<{ className?: string; icon: React.ReactNode; label: string; onClick: () => void }>) {
  return <button className={`inline-flex min-h-11 items-center gap-2 rounded px-3 text-left text-sm font-semibold text-on-surface hover:bg-surface-container ${className}`} onClick={onClick} type="button">{icon}{label}</button>;
}
