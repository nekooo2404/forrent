import {
  Archive,
  KeyRound,
  LoaderCircle,
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
  onStatus,
  pendingDelete,
  room,
}: Readonly<{
  isBusy: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onConfirmRental: () => void;
  onStatus: (statusValue: string) => void;
  pendingDelete: boolean;
  room: LandlordRoom;
}>) {
  const status = statusCopy[room.status] ?? statusCopy.DRAFT;
  const canEdit = ["DRAFT", "HIDDEN"].includes(room.status);
  const canPublish = ["DRAFT", "HIDDEN", "PENDING_REVIEW"].includes(room.status);
  const canReturnDraft = ["PENDING_REVIEW", "ARCHIVED"].includes(room.status);
  const canHide = room.status === "PUBLISHED";
  const canArchive = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "RENTED", "HIDDEN"].includes(room.status);
  const statusAllowsDeletion = ["DRAFT", "HIDDEN", "ARCHIVED"].includes(room.status);
  const canDelete = statusAllowsDeletion && room.can_delete;
  const isHistoryProtected = statusAllowsDeletion && !room.can_delete;

  return (
    <article aria-busy={isBusy} className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
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
              <dd className="mt-1 text-on-surface-variant">{formatVnd(room.price)}/tháng</dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Khu vực</dt>
              <dd className="mt-1 text-on-surface-variant">{roomWardName(room) || roomCityName(room) || "Chưa chọn"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Diện tích</dt>
              <dd className="mt-1 text-on-surface-variant">{formatArea(room.actual_area)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-on-surface">Cọc</dt>
              <dd className="mt-1 text-on-surface-variant">{formatVnd(room.deposit_amount)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-2 lg:w-72 lg:justify-end">
          {isBusy ? (
            <span className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-on-surface-variant" role="status">
              <LoaderCircle className="animate-spin" size={17} />
              Đang cập nhật
            </span>
          ) : null}
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant/70 px-3 text-sm font-semibold text-on-surface disabled:opacity-45"
            disabled={isBusy || !canEdit}
            onClick={onEdit}
            type="button"
          >
            <Pencil size={17} />
            Sửa
          </button>
          {canPublish ? (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-45"
              disabled={isBusy}
              onClick={() => onStatus("PUBLISHED")}
              type="button"
            >
              <Send size={17} />
              Đăng phòng
            </button>
          ) : null}
          {canReturnDraft ? (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant/70 px-3 text-sm font-semibold text-on-surface disabled:opacity-45"
              disabled={isBusy}
              onClick={() => onStatus("DRAFT")}
              type="button"
            >
              <RefreshCw size={17} />
              {room.status === "PENDING_REVIEW" ? "Rút về bản nháp" : "Khôi phục bản nháp"}
            </button>
          ) : null}
          {canHide ? (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-45"
              disabled={isBusy}
              onClick={onConfirmRental}
              type="button"
            >
              <KeyRound size={17} />
              Đã cho thuê
            </button>
          ) : null}
          {canHide ? (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant/70 px-3 text-sm font-semibold text-on-surface disabled:opacity-45"
              disabled={isBusy}
              onClick={() => onStatus("HIDDEN")}
              type="button"
            >
              <Archive size={17} />
              Ẩn phòng
            </button>
          ) : null}
          {canArchive ? (
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant/70 px-3 text-sm font-semibold text-on-surface disabled:opacity-45"
              disabled={isBusy}
              onClick={() => onStatus("ARCHIVED")}
              type="button"
            >
              <Archive size={17} />
              Lưu trữ
            </button>
          ) : null}
          {canDelete ? (
            <button
              aria-describedby={pendingDelete ? `delete-room-${room.id}-hint` : undefined}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                pendingDelete ? "border-error bg-error text-on-error" : "border-error/40 text-error"
              } disabled:opacity-45`}
              disabled={isBusy}
              onClick={onDelete}
              type="button"
            >
              <Trash2 size={17} />
              {pendingDelete ? "Xác nhận xóa" : "Xóa"}
            </button>
          ) : null}
        </div>
      </div>
      {pendingDelete ? (
        <p className="mt-3 text-right text-sm text-error" id={`delete-room-${room.id}-hint`} role="status">
          Thao tác này không thể hoàn tác. Bấm “Xác nhận xóa” lần nữa để tiếp tục.
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
