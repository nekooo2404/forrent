import Link from "next/link";

export function LandlordMetric({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-5 shadow-soft">
      <p className="text-sm font-semibold text-on-surface-variant">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-on-surface">{value}</p>
    </div>
  );
}

export function LandlordAccessState({
  actionHref,
  actionLabel,
  description,
  title,
}: Readonly<{
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}>) {
  return (
    <section className="px-margin-mobile pb-16 pt-28 md:px-margin-desktop">
      <div className="mx-auto max-w-2xl rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-8 text-center shadow-soft">
        <h1 className="font-headline-sm text-2xl text-on-surface">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-on-surface-variant">{description}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 font-semibold text-on-primary" href={actionHref}>
            {actionLabel}
          </Link>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-5 font-semibold text-on-surface" href="/contact">
            Liên hệ ForRent
          </Link>
        </div>
      </div>
    </section>
  );
}
