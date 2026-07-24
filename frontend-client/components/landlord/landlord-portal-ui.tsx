import type { ReactNode } from "react";

import { AlertCircle, LoaderCircle, RefreshCw } from "@/components/ui/icons";

import type { LandlordViewingRequest } from "./landlord-api";
import { viewingStatusLabels } from "./landlord-api";

export function LandlordPageHeader({
  actions,
  description,
  eyebrow,
  title,
}: Readonly<{
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}>) {
  return (
    <div className="flex flex-col gap-4 border-b border-outline-variant/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-tertiary">{eyebrow}</p>
        <h2 className="mt-2 font-headline-md text-3xl text-on-surface">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant md:text-base">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function LandlordLoadState({
  error,
  loading,
  onRetry,
}: Readonly<{ error?: string; loading: boolean; onRetry: () => void }>) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center border-y border-outline-variant/70 py-12 text-center">
      {loading ? (
        <LoaderCircle aria-hidden="true" className="animate-spin text-primary" size={28} />
      ) : (
        <AlertCircle aria-hidden="true" className="text-error" size={28} />
      )}
      <p className="mt-4 max-w-lg text-on-surface-variant">{error || "Đang tải dữ liệu..."}</p>
      {!loading ? (
        <button
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 font-semibold text-on-surface"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={18} />
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

const statusTone: Record<LandlordViewingRequest["status"], string> = {
  NEW: "bg-warning-container text-on-surface",
  CONTACTED: "bg-secondary-container text-on-secondary-container",
  SCHEDULED: "bg-primary-container text-on-primary-container",
  VIEWED: "bg-tertiary-container text-on-tertiary-container",
  CONVERTED: "bg-success-container text-on-surface",
  CANCELLED: "bg-surface-container-high text-on-surface-variant",
  NO_SHOW: "bg-error-container text-on-error-container",
};

export function LandlordViewingStatus({ status }: Readonly<{ status: LandlordViewingRequest["status"] }>) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-semibold ${statusTone[status]}`}>
      {viewingStatusLabels[status]}
    </span>
  );
}

export const landlordSecondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50";

export const landlordPrimaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";

export const landlordInputClass =
  "min-h-11 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10";
