export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Đang tải nội dung" className="min-h-[100dvh] bg-surface px-5 pb-16 pt-28 md:px-8 md:pt-32">
      <div className="mx-auto w-full max-w-container-max">
        <span className="sr-only" role="status">Đang tải nội dung...</span>
        <div aria-hidden="true" className="space-y-6">
          <div className="skeleton-shimmer h-8 w-64 max-w-full rounded-md" />
          <div className="skeleton-shimmer h-5 w-full max-w-xl rounded-md" />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="overflow-hidden rounded-lg border border-outline-variant/60 bg-surface-container-lowest" key={index}>
                <div className="skeleton-shimmer aspect-[4/3]" />
                <div className="space-y-3 p-5">
                  <div className="skeleton-shimmer h-5 w-3/4 rounded-md" />
                  <div className="skeleton-shimmer h-4 w-1/2 rounded-md" />
                  <div className="skeleton-shimmer h-11 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
