"use client";

import { CalendarDays, CheckCircle, Clock, X } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { modalBackdrop, modalPanel, MotionDiv, MotionModal } from "@/components/motion";
import { authFetch } from "@/lib/auth-storage";

type SubmitState = "idle" | "confirming" | "submitting" | "success" | "error";
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
  const [message, setMessage] = useState("");
  const [formSnapshot, setFormSnapshot] = useState<{ date: string; timeSlot: ViewingTimeSlot } | null>(null);
  const today = useSyncExternalStore(subscribeToDate, getTodaySnapshot, getServerTodaySnapshot);

  const isReady = useMemo(() => !disabled && Number.isInteger(roomId) && Number(roomId) > 0, [disabled, roomId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) {
      setState("error");
      setMessage("Phòng này đã được thuê, chưa thể đặt lịch xem.");
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
      setState("error");
      setMessage("Phòng này chưa có dữ liệu backend để đặt lịch xem.");
      return;
    }

    setState("submitting");
    setMessage("");

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
        setState("error");
        setMessage(
          response.status === 401
            ? "Vui lòng đăng nhập tài khoản khách thuê trước khi yêu cầu xem phòng."
            : errorText(payload),
        );
        return;
      }

      setState("success");
      setMessage("Yêu cầu xem phòng của bạn đã được xác nhận. Nhân viên hỗ trợ sẽ sớm liên hệ.");
    } catch {
      setState("error");
      setMessage("Không thể gửi yêu cầu xem phòng lúc này. Vui lòng thử lại sau.");
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-elevated md:p-7">
        <div className="mb-8">
          <span className="mb-2 block font-headline-sm text-headline-sm text-primary">Đặt lịch xem phòng</span>
          <span className="font-body-md text-body-md text-secondary">
            {disabled ? "Phòng đã thuê, vui lòng chọn phòng còn trống." : "Chọn ngày/giờ mong muốn. Saler sẽ gọi lại để xác nhận phòng, cọc và phí trước khi xem."}
          </span>
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

        {state === "error" ? (
          <div className="mt-6 border border-error bg-error-container/20 p-4 text-error">
            <p className="font-body-md text-body-md">{message}</p>
          </div>
        ) : null}

        {state === "success" ? (
          <div className="mt-6 border border-success/30 bg-success-container/40 p-4 text-success">
            <div className="flex gap-3">
              <CheckCircle className="mt-0.5 flex-shrink-0" size={20} strokeWidth={1.8} />
              <p className="font-body-md text-body-md">{message}</p>
            </div>
          </div>
        ) : null}
      </div>

      {state === "confirming" || state === "submitting" ? (
        <MotionModal>
          <MotionDiv
            animate="show"
            aria-label="Đóng xác nhận"
            className="absolute inset-0 bg-primary/40"
            exit="hidden"
            initial="hidden"
            onClick={() => setState("idle")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setState("idle");
            }}
            role="button"
            tabIndex={0}
            variants={modalBackdrop}
          />
          <MotionDiv
            animate="show"
            className="relative w-full max-w-md rounded-lg border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-elevated"
            exit="hidden"
            initial="hidden"
            variants={modalPanel}
          >
            <button
              aria-label="Đóng"
              className="absolute right-4 top-4 text-secondary transition-colors hover:text-primary"
              onClick={() => setState("idle")}
              type="button"
            >
              <X size={20} strokeWidth={1.8} />
            </button>
            <h3 className="mb-4 font-headline-sm text-headline-sm text-primary">Xác nhận yêu cầu xem</h3>
            <p className="mb-4 font-body-md text-body-md text-on-surface-variant">
              ForRent sẽ gửi yêu cầu này cho saler phụ trách. Saler gọi lại để xác nhận phòng còn trống, cọc, phí và giờ xem thực tế.
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
          </MotionDiv>
        </MotionModal>
      ) : null}
    </>
  );
}
