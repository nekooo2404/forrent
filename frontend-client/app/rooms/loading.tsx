import { PublicShell } from "@/components/public-shell";

export default function RoomsLoading() {
  return (
    <PublicShell active="rooms">
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pb-20 pt-32 md:px-margin-desktop">
        <div className="mb-10 h-20 w-full max-w-2xl rounded-lg bg-surface-container skeleton-shimmer" />
        <div className="grid gap-gutter lg:grid-cols-[280px_1fr]">
          <div className="h-11 rounded-lg bg-surface-container skeleton-shimmer lg:h-[560px]" />
          <div className="grid gap-gutter xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-[480px] rounded-lg bg-surface-container skeleton-shimmer" key={index} />
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
