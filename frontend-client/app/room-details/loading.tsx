import { SiteNav } from "@/components/site-nav";

export default function RoomDetailsLoading() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav active="rooms" />
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pb-24 pt-28 md:px-margin-desktop md:pt-32">
        <div className="mb-8 h-6 w-44 rounded bg-surface-container skeleton-shimmer" />
        <div className="mb-16 h-[512px] rounded-lg bg-surface-container skeleton-shimmer md:h-[716px]" />
        <div className="grid gap-gutter md:grid-cols-12">
          <div className="space-y-6 md:col-span-8">
            <div className="h-28 rounded-lg bg-surface-container skeleton-shimmer" />
            <div className="h-48 rounded-lg bg-surface-container skeleton-shimmer" />
            <div className="h-36 rounded-lg bg-surface-container skeleton-shimmer" />
          </div>
          <div className="h-[520px] rounded-lg bg-surface-container skeleton-shimmer md:col-span-4" />
        </div>
      </div>
    </main>
  );
}
