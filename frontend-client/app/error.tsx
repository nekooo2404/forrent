"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { PublicShell } from "@/components/public-shell";

export default function GlobalError() {
  return (
    <PublicShell>
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-24 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-error-container text-error">
          <AlertTriangle aria-hidden="true" size={24} strokeWidth={1.8} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-on-surface">Trang chưa thể tải lúc này</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-on-surface-variant">
          Kết nối có thể đang gián đoạn. Bạn có thể tiếp tục tìm phòng khác hoặc gửi nhu cầu để nhân viên tư vấn hỗ trợ.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-3 font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90" href="/rooms">
            Tìm phòng khác
          </Link>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant px-5 py-3 font-semibold text-on-surface transition-colors duration-200 hover:bg-surface-container-low" href="/contact">
            Gửi nhu cầu
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
