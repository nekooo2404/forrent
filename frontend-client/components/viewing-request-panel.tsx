"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, Info, LoaderCircle, X } from "@/components/ui/icons";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { MotionModal } from "@/components/motion";
import { recordProductDistribution, recordProductMetric } from "@/components/product-insights";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useToast } from "@/hooks/use-toast";
import { authFetch, getAuthSession } from "@/lib/auth-storage";

type SubmitState = "idle" | "confirming" | "submitting";
type AuthState = "loading" | "anonymous" | "authenticated";
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
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [state, setState] = useState<SubmitState>("idle");
  const [formSnapshot, setFormSnapshot] = useState<{ date: string; timeSlot: ViewingTimeSlot } | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<{ date: string; timeSlot: ViewingTimeSlot } | null>(null);
  const [draftDate, setDraftDate] = useState("");
  const [draftTimeSlot, setDraftTimeSlot] = useState<ViewingTimeSlot | "">("");
  const [validationError, setValidationError] = useState("");
  const today = useSyncExternalStore(subscribeToDate, getTodaySnapshot, getServerTodaySnapshot);
  const { toast } = useToast();
  const confirmModalRef = useFocusTrap<HTMLDivElement>(state === "confirming" || state === "submitting");
  const formStartedAt = useRef<number | null>(null);
  const submissionInFlight = useRef(false);

  const isReady = useMemo(
    () => authState === "authenticated" && !disabled && Number.isInteger(roomId) && Number(roomId) > 0,
    [authState, disabled, roomId],
  );
  const draftStorageKey = `forrent:viewing-request:${roomId ?? "unknown"}`;
  const metricAttributes = useMemo(
    () => ({
      has_room_id: Number.isInteger(roomId) && Number(roomId) > 0,
      ...(Number.isInteger(roomId) && Number(roomId) > 0 ? { room_id: Number(roomId) } : {}),
    }),
    [roomId],
  );

  useEffect(() => {
    let mounted = true;
    getAuthSession()
      .then((authenticated) => {
        if (mounted) setAuthState(authenticated ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (mounted) setAuthState("anonymous");
      });

    try {
      const saved = window.sessionStorage.getItem(draftStorageKey);
      if (saved) {
        const draft = JSON.parse(saved) as { date?: string; timeSlot?: ViewingTimeSlot };
        setDraftDate(draft.date ?? "");
        setDraftTimeSlot(draft.timeSlot ?? "");
      }
    } catch {
      window.sessionStorage.removeItem(draftStorageKey);
    }

    return () => {
      mounted = false;
    };
  }, [draftStorageKey]);

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
    if (!draftDate || !draftTimeSlot) {
      setValidationError("Vui l\u00f2ng ch\u1ecdn ng\u00e0y v\u00e0 khung gi\u1edd mong mu\u1ed1n.");
      return;
    }
    setValidationError("");
    const snapshot = { date: draftDate, timeSlot: draftTimeSlot };
    setFormSnapshot(snapshot);
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
    setState("confirming");
  }

  async function confirmRequest() {
    if (!isReady || !roomId) {
      toast({
        type: "error",
        title: "Thiếu dữ liệu phòng",
        message: "Phòng này chưa đủ thông tin để đặt lịch trực tuyến. Vui lòng liên hệ để được hỗ trợ.",
      });
      setState("idle");
      return;
    }

    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
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
        if (response.status === 401) setAuthState("anonymous");
        setState("idle");
        toast({
          type: "error",
          title: "Gửi yêu cầu thất bại",
          message: nextMessage,
        });
        recordProductMetric("viewing_request_failed", {
          ...metricAttributes,
          reason: response.status === 401 ? "authentication" : "api",
        });
        return;
      }

      setState("idle");
      setSubmittedRequest(formSnapshot);
      setDraftDate("");
      setDraftTimeSlot("");
      window.sessionStorage.removeItem(draftStorageKey);
      recordProductMetric("viewing_request_submitted", metricAttributes);
      if (formStartedAt.current !== null) {
        recordProductDistribution("viewing_request_completion_time", performance.now() - formStartedAt.current);
      }
      formStartedAt.current = null;
      toast({
        type: "success",
        title: "Đã ghi nhận yêu cầu",
        message: "Nhân viên tư vấn sẽ liên hệ để xác nhận ngày và giờ xem phòng.",
      });
    } catch {
      setState("idle");
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể gửi yêu cầu xem phòng lúc này. Vui lòng thử lại sau.",
      });
      recordProductMetric("viewing_request_failed", { ...metricAttributes, reason: "network" });
    } finally {
      submissionInFlight.current = false;
    }
  }

  const signInHref = `/log-in?next=${encodeURIComponent(`${pathname || "/rooms"}#viewing-request`)}`;

  return (
    <>
      <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-soft md:p-6">
        <div className="mb-6">
          <span className="mb-2 block font-headline-sm text-headline-sm text-on-surface">Đặt lịch xem phòng</span>
          {!disabled && (
            <div className="mt-4 rounded-md border-l-2 border-tertiary bg-tertiary-container/50 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface">
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

        {disabled ? (
          <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-outline-variant/70 px-4 py-3 font-semibold text-on-surface hover:bg-surface-container-low" href="/rooms">
            Tìm phòng khác
          </Link>
        ) : authState === "loading" ? (
          <div aria-busy="true" className="space-y-3" role="status">
            <div className="h-11 rounded-md bg-surface-container" />
            <div className="h-11 rounded-md bg-surface-container" />
            <p className="text-sm text-on-surface-variant">Đang kiểm tra phiên đăng nhập...</p>
          </div>
        ) : authState === "anonymous" ? (
          <div className="border-t border-outline-variant/50 pt-5">
            <h3 className="font-semibold text-on-surface">Đăng nhập trước khi chọn lịch</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Tài khoản giúp bạn theo dõi trạng thái xác nhận và tránh nhập lại thông tin liên hệ.
            </p>
            {draftDate && draftTimeSlot ? (
              <p className="mt-3 rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">
                Lịch đã lưu: {draftDate} · {timeSlotLabels[draftTimeSlot]}
              </p>
            ) : null}
            <div className="mt-5 grid gap-2">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-3 font-semibold text-on-primary transition-colors hover:bg-primary/90" href={signInHref}>
                Đăng nhập để đặt lịch
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-4 py-3 font-semibold text-on-surface transition-colors hover:bg-surface-container-low" href="/contact">
                Chưa có tài khoản? Gửi nhu cầu
              </Link>
            </div>
          </div>
        ) : submittedRequest ? (
          <div className="rounded-md border border-tertiary/30 bg-tertiary-container/50 p-4" data-testid="viewing-request-submitted" role="status">
            <div className="flex items-start gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-tertiary" size={21} strokeWidth={1.8} />
              <div>
                <h3 className="font-semibold text-on-surface">Yêu cầu đã được ghi nhận</h3>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                  Lịch mong muốn: {submittedRequest.date} · {timeSlotLabels[submittedRequest.timeSlot]}. Nhân viên tư vấn sẽ liên hệ trước khi lịch được xác nhận.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90" href="/profile">
                Theo dõi yêu cầu
              </Link>
              <button className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface transition-colors duration-200 hover:bg-surface-container-low" onClick={() => setSubmittedRequest(null)} type="button">
                Chọn lịch khác
              </button>
            </div>
          </div>
        ) : (
        <form
          className="space-y-5"
          noValidate
          onFocusCapture={() => {
            if (formStartedAt.current === null) {
              formStartedAt.current = performance.now();
              recordProductMetric("viewing_request_started", metricAttributes);
            }
          }}
          onSubmit={handleSubmit}
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-on-surface" htmlFor="viewing-date">
              Ngày mong muốn
            </label>
            <div className="relative">
              <CalendarDays
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={18}
                strokeWidth={1.8}
              />
              <input
                aria-describedby={validationError ? "viewing-request-error" : undefined}
                aria-invalid={Boolean(validationError && !draftDate)}
                className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-3 pl-10 text-base text-on-surface outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/10"
                id="viewing-date"
                min={today || undefined}
                name="date"
                disabled={disabled}
                onChange={(event) => {
                  setDraftDate(event.target.value);
                  if (validationError) setValidationError("");
                }}
                type="date"
                value={draftDate}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-on-surface" htmlFor="viewing-time">
              Thời gian
            </label>
            <div className="relative">
              <Clock
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={18}
                strokeWidth={1.8}
              />
              <select
                aria-describedby={validationError ? "viewing-request-error" : undefined}
                aria-invalid={Boolean(validationError && !draftTimeSlot)}
                className="min-h-11 w-full rounded-md border border-outline-variant/70 bg-surface-container-low px-3 py-3 pl-10 text-base text-on-surface outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/10"
                id="viewing-time"
                name="time_slot"
                disabled={disabled}
                onChange={(event) => {
                  setDraftTimeSlot(event.target.value as ViewingTimeSlot | "");
                  if (validationError) setValidationError("");
                }}
                value={draftTimeSlot}
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

          {validationError ? (
            <p className="rounded-md border border-error/30 bg-error-container px-3 py-2 text-sm text-on-error-container" id="viewing-request-error" role="alert">
              {validationError}
            </p>
          ) : null}

          <div className="mt-8 border-t border-outline-variant/20 pt-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-body-md text-body-md text-secondary">Phí hỗ trợ</span>
              <span className="font-body-md text-body-md font-semibold text-tertiary">Miễn phí</span>
            </div>
            <button
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-button text-button text-on-primary transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isReady || state === "submitting"}
              type="submit"
            >
              {state === "submitting" ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : null}
              {disabled ? "Phòng đã thuê" : state === "submitting" ? "Đang gửi..." : "Yêu cầu xem ngay"}
            </button>
          </div>
        </form>
        )}

      </div>

      {state === "confirming" || state === "submitting" ? (
        <MotionModal>
          <button
            aria-label="Đóng xác nhận"
            className="absolute inset-0 bg-on-surface/45"
            onClick={() => setState("idle")}
            type="button"
          />
          <div
            aria-describedby="confirm-modal-description"
            aria-labelledby="confirm-modal-title"
            aria-modal="true"
            className="scroll-reveal relative w-full max-w-md rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-6 shadow-elevated md:p-8"
            onKeyDown={(event) => {
              if (event.key === "Escape") setState("idle");
            }}
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
            <h3 className="mb-4 font-headline-sm text-headline-sm text-on-surface" id="confirm-modal-title">
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
                className="inline-flex min-h-11 items-center rounded-md border border-outline-variant px-6 py-3 font-button text-button text-on-surface transition-colors duration-200 hover:bg-surface-container-low"
                disabled={state === "submitting"}
                onClick={() => setState("idle")}
                type="button"
              >
                Hủy
              </button>
              <button
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-6 py-3 font-button text-button text-on-primary transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
