import { PublicShell } from "@/components/public-shell";

const skeleton = "motion-safe:animate-pulse rounded-md bg-surface-container";

export default function RoomDetailLoading() {
  return (
    <PublicShell active="rooms">
      <main
        aria-busy="true"
        className="mx-auto w-full max-w-container-max flex-grow px-margin-mobile pb-24 pt-28 md:px-margin-desktop md:pt-32"
      >
        <p className="sr-only" role="status">Đang tải thông tin phòng.</p>
        <div className={`${skeleton} mb-8 h-11 w-52`} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section aria-hidden="true" className="min-w-0">
            <div className={`${skeleton} aspect-[16/10] w-full`} />
            <div className="mt-6 space-y-4">
              <div className={`${skeleton} h-8 w-4/5`} />
              <div className={`${skeleton} h-5 w-3/5`} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className={`${skeleton} h-20`} key={index} />
                ))}
              </div>
              <div className={`${skeleton} h-32 w-full`} />
            </div>
          </section>

          <aside aria-hidden="true" className="space-y-4">
            <div className={`${skeleton} h-52 w-full`} />
            <div className={`${skeleton} h-72 w-full`} />
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}
