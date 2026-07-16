import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ngoại tuyến",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-surface px-margin-mobile text-on-surface" id="main-content" tabIndex={-1}>
      <section className="max-w-lg rounded-lg border border-outline-variant/30 bg-surface-container-lowest p-8 text-center">
        <p className="font-label-caps text-label-caps text-secondary">ForRent</p>
        <h1 className="mt-3 font-headline-md text-headline-md text-on-surface">Bạn đang ngoại tuyến</h1>
        <p className="mt-4 leading-7 text-on-surface-variant">
          Kiểm tra kết nối rồi tải lại trang. Những trang bạn đã mở trước đó vẫn có thể xem từ bộ nhớ thiết bị.
        </p>
        <Link className="premium-button mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-3 font-semibold text-on-primary" href="/">
          Thử lại
        </Link>
      </section>
    </main>
  );
}
