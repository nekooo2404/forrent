"use client";

import type { FormEvent } from "react";
import { useState } from "react";

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

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      setState("error");
      setStatusMessage("Vui lòng kiểm tra lại các trường bắt buộc.");
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const payload = {
      full_name: String(formData.get("fullName") ?? "").trim(),
      phone: normalizePhone(String(formData.get("phone") ?? "")),
      email: String(formData.get("email") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    setState("submitting");
    setStatusMessage("");

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
        setState("error");
        setStatusMessage(errorText(data));
        return;
      }

      form.reset();
      setState("success");
      setStatusMessage("Cảm ơn bạn. Đội hỗ trợ sẽ liên hệ trong thời gian sớm nhất.");
    } catch {
      setState("error");
      setStatusMessage("Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.");
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block font-label-caps text-label-caps text-on-surface-variant" htmlFor="fullName">
          HỌ VÀ TÊN
        </label>
        <input
          className="w-full border-0 border-b border-outline-variant/50 bg-transparent px-0 py-3 font-body-md text-body-md text-primary placeholder:text-outline-variant/50 focus:border-primary focus:ring-0"
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
            id="phone"
            inputMode="tel"
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
          placeholder="Chúng tôi có thể giúp gì cho bạn?"
          required
          rows={4}
        />
      </div>

      <button
        className="flex w-full items-center justify-center bg-primary px-6 py-4 font-button text-button text-on-primary transition-opacity duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={state === "submitting"}
        type="submit"
      >
        {state === "submitting" ? "ĐANG GỬI..." : "GỬI YÊU CẦU"}
      </button>

      {state === "success" ? (
        <div className="border border-[#4a7c59] bg-[#4a7c59]/10 p-4 text-center text-[#4a7c59]">
          <p className="font-body-md text-body-md">{statusMessage}</p>
        </div>
      ) : null}

      {state === "error" ? (
        <div className="border border-error bg-error-container/20 p-4 text-center text-error">
          <p className="font-body-md text-body-md">{statusMessage}</p>
        </div>
      ) : null}
    </form>
  );
}
