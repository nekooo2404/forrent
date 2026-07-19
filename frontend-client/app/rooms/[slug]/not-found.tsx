import Link from "next/link";

import { SearchX } from "@/components/ui/icons";
import { PublicShell } from "@/components/public-shell";

export default function RoomNotFound() {
  return (
    <PublicShell active="rooms">
      <main className="mx-auto flex min-h-[70dvh] w-full max-w-3xl flex-col justify-center px-margin-mobile pb-20 pt-32 md:px-margin-desktop">
        <SearchX aria-hidden="true" className="text-tertiary" size={36} weight="duotone" />
        <h1 className="mt-6 font-headline-md text-headline-md text-on-surface">Không tìm thấy phòng</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
          Đường dẫn có thể đã thay đổi hoặc phòng đã ngừng hiển thị. Bạn vẫn có thể tìm phòng khác hoặc gửi tiêu chí để được tư vấn.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 py-3 font-semibold text-on-primary hover:bg-primary/90" href="/rooms">
            Tìm phòng khác
          </Link>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-6 py-3 font-semibold text-on-surface hover:bg-surface-container-low" href="/contact">
            Gửi nhu cầu
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
