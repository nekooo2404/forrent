import { PublicShell } from "@/components/public-shell";

export default function RoomDetailsLoading() {
  return (
    <PublicShell active="rooms">
      <div aria-busy="true" aria-label="Đang tải thông tin phòng" className="mx-auto w-full max-w-container-max px-margin-mobile pb-24 pt-28 md:px-margin-desktop md:pt-32" role="status">
        <div className="mb-8 h-6 w-44 rounded bg-surface-container skeleton-shimmer" />
        <div className="mb-5 h-52 rounded-lg bg-surface-container skeleton-shimmer md:hidden" />
        <div className="mb-6 h-[320px] rounded-lg bg-surface-container skeleton-shimmer md:h-[440px]" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="hidden h-44 rounded-lg bg-surface-container skeleton-shimmer md:block" />
            <div className="h-48 rounded-lg bg-surface-container skeleton-shimmer" />
            <div className="h-36 rounded-lg bg-surface-container skeleton-shimmer" />
          </div>
          <div className="h-[520px] rounded-lg bg-surface-container skeleton-shimmer" />
        </div>
        <span className="sr-only">Đang tải thông tin phòng...</span>
      </div>
    </PublicShell>
  );
}
