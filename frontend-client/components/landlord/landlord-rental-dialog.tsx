import type { RefObject } from "react";

import { CheckCircle2, KeyRound, LoaderCircle } from "@/components/ui/icons";

import type { LandlordRentalCandidate, LandlordRoom } from "./landlord-room-types";

type LandlordRentalDialogProps = {
  candidates: LandlordRentalCandidate[];
  dialogRef: RefObject<HTMLDivElement | null>;
  error: string;
  isLoading: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSelect: (candidateId: number) => void;
  room: LandlordRoom;
  selectedCandidateId: number | null;
};

const statusLabels: Record<string, string> = {
  NEW: "Yêu cầu mới",
  CONTACTED: "Đã liên hệ",
  SCHEDULED: "Đã xác nhận lịch",
  VIEWED: "Đã xem phòng",
};

function viewingDate(candidate: LandlordRentalCandidate) {
  const date = candidate.appointment_date || candidate.preferred_viewing_date;
  if (!date) return "Chưa có ngày xem";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(`${date}T00:00:00`));
}

export function LandlordRentalDialog({
  candidates,
  dialogRef,
  error,
  isLoading,
  isSubmitting,
  onClose,
  onConfirm,
  onSelect,
  room,
  selectedCandidateId,
}: Readonly<LandlordRentalDialogProps>) {
  const eligibleCount = candidates.filter((candidate) => candidate.can_confirm_rental).length;

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto bg-inverse-surface/55 px-4 py-8 backdrop-blur-sm">
      <div
        aria-describedby="landlord-rental-description"
        aria-labelledby="landlord-rental-title"
        aria-modal="true"
        className="mx-auto max-w-2xl rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-high md:p-7"
        ref={dialogRef}
        role="dialog"
      >
        <header className="flex flex-col gap-3 border-b border-outline-variant/70 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-tertiary">Xác nhận khách thuê</p>
            <h2 className="mt-2 font-headline-sm text-2xl text-on-surface" id="landlord-rental-title">
              Đánh dấu phòng đã cho thuê
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant" id="landlord-rental-description">
              Chọn khách đã xác nhận lịch hoặc đã xem {room.public_title || room.title}. Thao tác này tạo lịch sử thuê và gỡ phòng khỏi danh sách công khai.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-outline-variant/70 px-4 text-sm font-semibold text-on-surface"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </header>

        {error ? (
          <div className="mt-5 rounded-md border border-error/30 bg-error-container p-3 text-sm text-on-error-container" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center gap-3 text-on-surface-variant" role="status">
            <LoaderCircle className="animate-spin" size={22} />
            Đang tải khách quan tâm...
          </div>
        ) : candidates.length ? (
          <fieldset className="mt-5 grid gap-3">
            <legend className="mb-2 text-sm font-semibold text-on-surface">
              Khách quan tâm ({eligibleCount} người đủ điều kiện xác nhận)
            </legend>
            {candidates.map((candidate) => (
              <label
                className={`grid min-h-11 cursor-pointer gap-2 rounded-md border p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${
                  candidate.can_confirm_rental
                    ? "border-outline-variant/70 hover:border-primary/60"
                    : "cursor-not-allowed border-outline-variant/40 bg-surface-container text-on-surface-variant"
                }`}
                key={candidate.id}
              >
                <input
                  checked={selectedCandidateId === candidate.id}
                  className="mt-1 size-5 accent-primary sm:mt-0"
                  disabled={!candidate.can_confirm_rental || isSubmitting}
                  name="rental-candidate"
                  onChange={() => onSelect(candidate.id)}
                  type="radio"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-on-surface">{candidate.full_name}</span>
                  <span className="mt-1 block break-words text-sm text-on-surface-variant">
                    {candidate.phone} · {candidate.email}
                  </span>
                  <span className="mt-1 block text-sm text-on-surface-variant">{viewingDate(candidate)}</span>
                </span>
                <span className="text-sm font-semibold text-tertiary">
                  {statusLabels[candidate.status] || candidate.status}
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-outline-variant p-6 text-center">
            <KeyRound className="mx-auto text-tertiary" size={28} />
            <p className="mt-3 font-semibold text-on-surface">Chưa có khách quan tâm cho phòng này</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Khi khách gửi yêu cầu xem phòng, thông tin của họ sẽ xuất hiện tại đây. Chỉ lịch đã xác nhận hoặc khách đã xem mới có thể được ghi nhận thuê.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-outline-variant/70 pt-5 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-5 text-sm font-semibold text-on-surface"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!selectedCandidateId || isLoading || isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? <LoaderCircle className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            {isSubmitting ? "Đang xác nhận" : "Xác nhận đã cho thuê"}
          </button>
        </div>
      </div>
    </div>
  );
}
