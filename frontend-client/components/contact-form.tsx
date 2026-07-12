"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type FormState = "idle" | "submitting" | "success" | "error";

type ContactApiResponse = {
  success: boolean;
  message: string;
  errors?: unknown;
};

function normalizePhone(value: string) {
  return value.replace(/[\s\-()]/g, "");
}

function errorText(payload: ContactApiResponse) {
  if (payload.message && payload.message !== "Validation error") {
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
  return "Vui lòng kiểm tra lại các trường bắt buộc.";
}

export function ContactForm({ roomId, roomTitle }: Readonly<{ roomId?: number | null; roomTitle?: string }>) {
  const [state, setState] = useState<FormState>("idle");
  const { toast } = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      const message = "Vui lòng kiểm tra lại các trường bắt buộc.";
      setState("error");
      toast({
        type: "error",
        title: "Lỗi xác thực",
        message,
      });
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const payload = {
      full_name: String(formData.get("fullName") ?? "").trim(),
      phone: normalizePhone(String(formData.get("phone") ?? "")),
      email: String(formData.get("email") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
      ...(roomId ? { room_id: roomId } : {}),
    };

    setState("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as ContactApiResponse;

      if (!response.ok || !data.success) {
        const message = errorText(data);
        setState("error");
        toast({
          type: "error",
          title: "Gửi thất bại",
          message,
        });
        return;
      }

      const message = "Đã nhận yêu cầu. Nhân viên tư vấn sẽ liên hệ để xác nhận phòng, cọc và lịch xem.";
      form.reset();
      setState("success");
      toast({
        type: "success",
        title: "Gửi thành công",
        message,
      });
    } catch {
      const message = "Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.";
      setState("error");
      toast({
        type: "error",
        title: "Lỗi kết nối",
        message,
      });
    }
  }

  return (
    <form aria-busy={state === "submitting"} className="space-y-8" onSubmit={handleSubmit}>
      {roomTitle ? (
        <div className="rounded border border-primary/10 bg-surface-container-low p-4 text-sm text-primary">
          Tư vấn phòng: <span className="font-semibold">{roomTitle}</span>
        </div>
      ) : null}
      <div>
        <label className="mb-2 block font-label-caps text-label-caps text-on-surface-variant" htmlFor="fullName">
          HỌ VÀ TÊN
        </label>
        <input
          className="w-full border-0 border-b border-outline-variant/50 bg-transparent px-0 py-3 font-body-md text-body-md text-primary placeholder:text-outline-variant/50 focus:border-primary focus:ring-0"
          autoComplete="name"
          id="fullName"
          name="fullName"
          placeholder="Họ và tên của bạn"
          required
          type="text"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <label className="mb-2 block font-label-caps text-label-caps text-on-surface-variant" htmlFor="email">
            ĐỊA CHỈ EMAIL
          </label>
          <input
            className="w-full border-0 border-b border-outline-variant/50 bg-transparent px-0 py-3 font-body-md text-body-md text-primary placeholder:text-outline-variant/50 focus:border-primary focus:ring-0"
            autoComplete="email"
            id="email"
            name="email"
            placeholder="your@email.com"
            required
            type="email"
          />
        </div>
        <div>
          <label className="mb-2 block font-label-caps text-label-caps text-on-surface-variant" htmlFor="phone">
            SỐ ĐIỆN THOẠI
          </label>
          <input
            className="w-full border-0 border-b border-outline-variant/50 bg-transparent px-0 py-3 font-body-md text-body-md text-primary placeholder:text-outline-variant/50 focus:border-primary focus:ring-0"
            autoComplete="tel"
            id="phone"
            inputMode="tel"
            minLength={10}
            name="phone"
            pattern="(0|\+84)[0-9\s\-()]{9,13}"
            placeholder="0900 000 000"
            required
            type="tel"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-label-caps text-label-caps text-on-surface-variant" htmlFor="message">
          LỜI NHẮN
        </label>
        <textarea
          className="w-full rounded border border-outline-variant/50 bg-transparent px-4 py-3 font-body-md text-body-md text-primary placeholder:text-outline-variant/50 focus:border-primary focus:ring-0"
          id="message"
          name="message"
          placeholder="Ví dụ: Mình cần phòng ở Tây Mỗ, dưới 5 triệu/tháng, có thể xem cuối tuần."
          required
          rows={4}
        />
      </div>

      <button
        className="premium-button flex w-full items-center justify-center rounded bg-primary px-6 py-4 font-button text-button text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={state === "submitting"}
        type="submit"
      >
        {state === "submitting" ? "Đang gửi..." : "Gửi nhu cầu thuê phòng"}
      </button>
      <p className="text-center text-sm leading-6 text-on-surface-variant">
        Sau khi gửi, nhân viên tư vấn sẽ gọi lại để xác nhận phòng còn trống, cọc, phí và lịch xem.
      </p>

    </form>
  );
}
