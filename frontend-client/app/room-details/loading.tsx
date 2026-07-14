import { PublicShell } from "@/components/public-shell";

export default function RoomDetailsLoading() {
  return (
    <PublicShell active="rooms">
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pb-24 pt-28 md:px-margin-desktop md:pt-32">
        <div className="mb-8 h-6 w-44 rounded bg-surface-container skeleton-shimmer" />
        <div className="mb-5 h-52 rounded-lg bg-surface-container skeleton-shimmer md:hidden" />
        <div className="mb-6 h-[320px] rounded-lg bg-surface-container skeleton-shimmer md:h-[440px]" />
        <div className="grid gap-gutter md:grid-cols-12">
          <div className="space-y-6 md:col-span-8">
            <div className="hidden h-44 rounded-lg bg-surface-container skeleton-shimmer md:block" />
            <div className="h-48 rounded-lg bg-surface-container skeleton-shimmer" />
            <div className="h-36 rounded-lg bg-surface-container skeleton-shimmer" />
          </div>
          <div className="h-[520px] rounded-lg bg-surface-container skeleton-shimmer md:col-span-4" />
        </div>
      </div>
    </PublicShell>
  );
}
