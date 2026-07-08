"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="bg-surface text-on-surface">
        <main className="flex min-h-[100dvh] items-center justify-center px-6">
          <section className="max-w-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-center shadow-soft">
            <p className="font-label-caps text-label-caps uppercase tracking-widest text-primary">ForRent</p>
            <h1 className="mt-3 font-headline-sm text-headline-sm text-on-surface">Không tải được trang</h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Hệ thống đã ghi nhận lỗi. Vui lòng thử lại sau ít phút.
            </p>
            <button className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary" onClick={reset} type="button">
              Thử lại
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
