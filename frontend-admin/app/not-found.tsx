import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-surface px-5 py-16 text-center text-on-surface">
      <section className="w-full max-w-lg rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-8 shadow-soft">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-tertiary-container text-tertiary">
          <SearchX aria-hidden="true" size={24} strokeWidth={1.8} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Không tìm thấy trang quản trị</h1>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Đường dẫn có thể đã thay đổi. Quay lại tổng quan để tiếp tục công việc.
        </p>
        <Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary/90" href="/admin">
          Về tổng quan
        </Link>
      </section>
    </main>
  );
}
