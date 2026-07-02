"use client";

import { ChevronDown, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import { authFetch } from "@/lib/auth-storage";

type SubmitState = "idle" | "submitting" | "success" | "error";

type BlogSubmitResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[] | string>;
};

function firstError(payload: BlogSubmitResponse) {
  if (payload.message) {
    return payload.message;
  }
  const error = Object.values(payload.errors ?? {})[0];
  return Array.isArray(error) ? error[0] : error || "Không thể gửi bài viết lúc này.";
}

export function BlogSubmitForm() {
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    setState("submitting");
    setMessage("");

    try {
      const response = await authFetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          short_description: String(formData.get("short_description") ?? ""),
          content: String(formData.get("content") ?? ""),
        }),
      });
      const payload = (await response.json()) as BlogSubmitResponse;

      if (!response.ok || !payload.success) {
        setState("error");
        setMessage(response.status === 401 ? "Vui lòng đăng nhập để đăng bài viết." : firstError(payload));
        return;
      }

      form.reset();
      setState("success");
      setMessage("Bài viết đã được gửi và đang chờ duyệt.");
    } catch {
      setState("error");
      setMessage("Không thể gửi bài viết lúc này.");
    }
  }

  return (
    <section className="mx-auto mb-16 max-w-[900px] px-margin-mobile md:px-margin-desktop">
      <details className="group rounded-lg border border-outline-variant/15 bg-surface-container-lowest shadow-soft">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 md:p-8">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary">Đăng bài chia sẻ</h2>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">Người thuê có thể gửi kinh nghiệm, bài viết sẽ được duyệt trước khi hiển thị.</p>
          </div>
          <ChevronDown className="shrink-0 text-outline transition-transform group-open:rotate-180" size={22} strokeWidth={1.8} />
        </summary>

        <form className="border-t border-outline-variant/10 p-6 pt-0 md:p-8 md:pt-0" onSubmit={handleSubmit}>

        <div className="grid gap-5">
          <label className="grid gap-2 font-body-md text-body-md text-primary">
            Tiêu đề
            <input
              className="rounded border border-outline-variant/40 bg-transparent px-4 py-3 text-primary outline-none transition focus:border-primary"
              maxLength={255}
              name="title"
              required
              type="text"
            />
          </label>

          <label className="grid gap-2 font-body-md text-body-md text-primary">
            Mô tả ngắn
            <textarea
              className="min-h-24 rounded border border-outline-variant/40 bg-transparent px-4 py-3 text-primary outline-none transition focus:border-primary"
              maxLength={500}
              name="short_description"
            />
          </label>

          <label className="grid gap-2 font-body-md text-body-md text-primary">
            Nội dung
            <textarea
              className="min-h-48 rounded border border-outline-variant/40 bg-transparent px-4 py-3 text-primary outline-none transition focus:border-primary"
              maxLength={20000}
              name="content"
              required
            />
          </label>
        </div>

        {message ? (
          <p className={`mt-5 rounded-md border p-4 text-sm ${state === "success" ? "border-success/30 bg-success-container/40 text-success" : "border-error/30 bg-error-container/30 text-error"}`} role="status">
            {message}
          </p>
        ) : null}

        <button
          className="premium-button mt-6 inline-flex items-center gap-2 rounded bg-primary px-6 py-3 font-button text-button text-on-primary transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={state === "submitting"}
          type="submit"
        >
          <Send aria-hidden="true" size={16} strokeWidth={1.8} />
          {state === "submitting" ? "Đang gửi..." : "Gửi bài viết"}
        </button>
        </form>
      </details>
    </section>
  );
}
