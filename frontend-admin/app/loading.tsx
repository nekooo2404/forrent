export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Đang tải trang quản trị" className="min-h-[100dvh] bg-surface px-5 py-8 text-on-surface md:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <span className="sr-only" role="status">Đang tải trang quản trị...</span>
        <div aria-hidden="true" className="space-y-6">
          <div className="skeleton-shimmer h-8 w-64 max-w-full rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5" key={index}>
                <div className="skeleton-shimmer h-4 w-24 rounded-md" />
                <div className="skeleton-shimmer mt-4 h-8 w-20 rounded-md" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5">
            <div className="skeleton-shimmer h-5 w-40 rounded-md" />
            <div className="skeleton-shimmer mt-5 h-72 w-full rounded-md" />
          </div>
        </div>
      </div>
    </main>
  );
}
