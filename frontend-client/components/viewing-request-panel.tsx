"use client";

import { CalendarDays, Clock, X, Info } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { MotionModal } from "@/components/motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth-storage";

type SubmitState = "idle" | "confirming" | "submitting";
type ViewingTimeSlot = "morning" | "afternoon" | "evening";

type ViewingRequestPanelProps = {
  disabled?: boolean;
  roomId: number | null;
};

type ViewingRequestApiResponse = {
  success: boolean;
  message: string;
  errors?: unknown;
};

const timeSlotLabels: Record<ViewingTimeSlot, string> = {
  morning: "Sáng, 9:00 - 12:00",
  afternoon: "Chiều, 12:00 - 16:00",
  evening: "Tối, 16:00 - 19:00",
};

function subscribeToDate() {
  return () => undefined;
}

function getTodaySnapshot() {
  return new Date().toISOString().slice(0, 10);
}

function getServerTodaySnapshot() {
  return "";
}

function errorText(payload: ViewingRequestApiResponse) {
  if (payload.message) {
    return payload.message;
  }
  if (payload.errors && typeof payload.errors === "object") {
    const firstError = Object.values(payload.errors as Record<string, unknown>)[0];
    if (Array.isArray(firstError) && firstError[0]) {
      return String(firstError[0]);
    }
    if (firstError) {
      return String(firstError);
    }
  }
  return "Không thể gửi yêu cầu xem phòng lúc này.";
}

export function ViewingRequestPanel({ disabled = false, roomId }: ViewingRequestPanelProps) {
  const [state, setState] = useState<SubmitState>("idle");
  const [formSnapshot, setFormSnapshot] = useState<{ date: string; timeSlot: ViewingTimeSlot } | null>(null);
  const today = useSyncExternalStore(subscribeToDate, getTodaySnapshot, getServerTodaySnapshot);
  const { toast } = useToast();
  const confirmModalRef = useFocusTrap<HTMLDivElement>(state === "confirming" || state === "submitting");

  const isReady = useMemo(() => !disabled && Number.isInteger(roomId) && Number(roomId) > 0, [disabled, roomId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      toast({
        type: "error",
        title: "Không thể đặt lịch",
        message: "Phòng này đã được thuê, chưa thể đặt lịch xem.",
      });
      return;
    }
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    setFormSnapshot({
      date: String(formData.get("date") ?? ""),
      timeSlot: String(formData.get("time_slot") ?? "morning") as ViewingTimeSlot,
    });
    setState("confirming");
  }

  async function confirmRequest() {
    if (!isReady || !roomId) {
      toast({
        type: "error",
        title: "Thiếu dữ liệu phòng",
        message: "Phòng này chưa có dữ liệu backend để đặt lịch xem.",
      });
      setState("idle");
      return;
    }

    setState("submitting");

    try {
      const response = await authFetch("/api/viewing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId,
          preferred_viewing_date: formSnapshot?.date,
          preferred_viewing_time_slot: formSnapshot?.timeSlot,
        }),
      });
      const payload = (await response.json()) as ViewingRequestApiResponse;

      if (!response.ok || !payload.success) {
        const nextMessage =
          response.status === 401
            ? "Vui lòng đăng nhập tài khoản khách thuê trước khi yêu cầu xem phòng."
            : errorText(payload);
        setState("idle");
        toast({
          type: "error",
          title: "Gửi yêu cầu thất bại",
          message: nextMessage,
        });
        return;
      }

      setState("idle");
      toast({
        type: "success",
        title: "Đã gửi yêu cầu xem phòng",
        message: "Yêu cầu xem phòng của bạn đã được xác nhận. Nhân viên hỗ trợ sẽ sớm liên hệ.",
      });
    } catch {
      setState("idle");
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể gửi yêu cầu xem phòng lúc này. Vui lòng thử lại sau.",
      });
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-elevated md:p-7">
        <div className="mb-6">
          <span className="mb-2 block font-headline-sm text-headline-sm text-primary">Đặt lịch xem phòng</span>
          {!disabled && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <Info size={16} strokeWidth={1.8} />
                Quy trình xem phòng
              </h3>
              <ol className="space-y-1.5 text-sm text-secondary">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Chọn ngày và giờ phù hợp</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Nhân viên tư vấn gọi lại xác nhận trong 24h</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Đến xem phòng theo lịch hẹn</span>
                </li>
              </ol>
            </div>
          )}
          {disabled && (
            <span className="font-body-md text-body-md text-secondary">
              Phòng đã thuê, vui lòng chọn phòng còn trống.
            </span>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block font-label-caps text-label-caps text-primary" htmlFor="viewing-date">
              Ngày mong muốn
            </label>
            <div className="relative border-b border-outline-variant transition-colors focus-within:border-gold">
              <CalendarDays
                aria-hidden="true"
                className="absolute left-0 top-1/2 -translate-y-1/2 text-secondary"
                size={18}
                strokeWidth={1.8}
              />
              <input
                className="w-full border-none bg-transparent py-2 pl-8 font-body-md text-primary focus:ring-0"
                id="viewing-date"
                min={today || undefined}
                name="date"
                required
                disabled={disabled}
                type="date"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-label-caps text-label-caps text-primary" htmlFor="viewing-time">
              Thời gian
            </label>
            <div className="relative border-b border-outline-variant transition-colors focus-within:border-gold">
              <Clock
                aria-hidden="true"
                className="absolute left-0 top-1/2 -translate-y-1/2 text-secondary"
                size={18}
                strokeWidth={1.8}
              />
              <select
                className="w-full border-none bg-transparent py-2 pl-8 font-body-md text-primary focus:ring-0"
                defaultValue=""
                id="viewing-time"
                name="time_slot"
                required
                disabled={disabled}
              >
                <option disabled value="">
                  Chọn thời gian
                </option>
                <option value="morning">Sáng, 9:00 - 12:00</option>
                <option value="afternoon">Chiều, 12:00 - 16:00</option>
                <option value="evening">Tối, 16:00 - 19:00</option>
              </select>
            </div>
          </div>

          <div className="mt-8 border-t border-outline-variant/20 pt-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-body-md text-body-md text-secondary">Phí hỗ trợ</span>
              <span className="font-body-md text-body-md text-primary">Miễn phí</span>
            </div>
            <button
              className="w-full rounded bg-primary py-4 font-button text-button text-on-primary transition-colors duration-300 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isReady || state === "submitting"}
              type="submit"
            >
              {disabled ? "Phòng đã thuê" : "Yêu cầu xem ngay"}
            </button>
          </div>
        </form>

      </div>

      {state === "confirming" || state === "submitting" ? (
        <MotionModal>
          <button
            aria-label="Đóng xác nhận"
            className="absolute inset-0 bg-primary/40"
            onClick={() => setState("idle")}
            type="button"
          />
          <div
            aria-describedby="confirm-modal-description"
            aria-labelledby="confirm-modal-title"
            aria-modal="true"
            className="scroll-reveal relative w-full max-w-md rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-elevated"
            ref={confirmModalRef}
            role="dialog"
          >
            <button
              aria-label="Đóng"
              className="absolute right-2 top-2 flex size-11 items-center justify-center text-secondary transition-colors hover:text-primary"
              onClick={() => setState("idle")}
              type="button"
            >
              <X size={20} strokeWidth={1.8} />
            </button>
            <h3 className="mb-4 font-headline-sm text-headline-sm text-primary" id="confirm-modal-title">
              Xác nhận yêu cầu xem
            </h3>
            <p className="mb-4 font-body-md text-body-md text-on-surface-variant" id="confirm-modal-description">
              ForRent sẽ gửi yêu cầu này cho nhân viên phụ trách. Nhân viên tư vấn gọi lại để xác nhận phòng còn trống, cọc, phí và giờ xem thực tế.
            </p>
            {formSnapshot ? (
              <p className="mb-8 font-body-md text-sm text-secondary">
                Lịch mong muốn: {formSnapshot.date} · {timeSlotLabels[formSnapshot.timeSlot]}
              </p>
            ) : null}
            <div className="flex justify-end gap-4">
              <button
                className="rounded border border-outline-variant px-6 py-3 font-button text-button text-primary transition-colors hover:bg-surface-container"
                disabled={state === "submitting"}
                onClick={() => setState("idle")}
                type="button"
              >
                Hủy
              </button>
              <button
                className="rounded bg-gold px-6 py-3 font-button text-button text-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={state === "submitting"}
                onClick={confirmRequest}
                type="button"
              >
                {state === "submitting" ? "Đang gửi..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </MotionModal>
      ) : null}
    </>
  );
}
