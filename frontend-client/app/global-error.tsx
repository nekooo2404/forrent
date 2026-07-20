"use client";

import Link from "next/link";
import { useEffect } from "react";
import { runWithSentry } from "@/lib/sentry-client";

export default function GlobalError({
  error,
}: Readonly<{
  error: Error & { digest?: string };
}>) {
  useEffect(() => {
    runWithSentry((client) => client.captureException(error), { immediate: true });
  }, [error]);

  return (
    <html lang="vi">
      <body className="bg-surface text-on-surface">
        <main className="flex min-h-[100dvh] items-center justify-center px-6">
          <section className="max-w-md rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-6 text-center shadow-soft">
            <p className="font-label-caps text-label-caps uppercase text-primary">ForRent</p>
            <h1 className="mt-3 font-headline-sm text-headline-sm text-on-surface">Không tải được trang</h1>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              Hệ thống đã ghi nhận lỗi. Bạn có thể tìm phòng khác hoặc gửi nhu cầu để được hỗ trợ.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90" href="/rooms">
                Tìm phòng khác
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface transition-colors duration-200 hover:bg-surface-container-low" href="/contact">
                Gửi nhu cầu
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
