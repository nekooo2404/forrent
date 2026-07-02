import { SiteNav } from "@/components/site-nav";

export default function RoomsLoading() {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <SiteNav active="rooms" />
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pb-20 pt-32 md:px-margin-desktop">
        <div className="mb-10 h-20 w-full max-w-2xl rounded-lg bg-surface-container skeleton-shimmer" />
        <div className="grid gap-gutter md:grid-cols-[280px_1fr]">
          <div className="h-[560px] rounded-lg bg-surface-container skeleton-shimmer" />
          <div className="grid gap-gutter xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-[560px] rounded-xl bg-surface-container skeleton-shimmer" key={index} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
