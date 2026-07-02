"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

import { blogStatusLabel, blogStatusTone, contactStatusLabel, contactStatusTone, leadStatusLabel, leadStatusTone, roomStatusTone } from "./admin-api";

export function AdminPageHeader({
  actions,
  eyebrow,
  subtitle,
  title,
}: Readonly<{
  actions?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
}>) {
  return (
    <section className="mb-6 flex flex-col gap-4 border-b border-primary/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{eyebrow}</p> : null}
        <h1 className="font-headline-md text-3xl leading-tight text-primary md:text-[40px]">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary md:text-base">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </section>
  );
}

export function AdminPanel({
  children,
  className = "",
  title,
  toolbar,
}: Readonly<{
  children: ReactNode;
  className?: string;
  title?: string;
  toolbar?: ReactNode;
}>) {
  return (
    <section className={`admin-spotlight rounded-xl border border-primary/10 bg-white/90 p-5 shadow-soft backdrop-blur md:p-6 ${className}`}>
      {title || toolbar ? (
        <div className="mb-5 flex flex-col gap-3 border-b border-primary/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          {title ? <h2 className="font-headline-sm text-xl text-primary md:text-2xl">{title}</h2> : <span />}
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminStatCard({
  caption,
  icon,
  label,
  value,
}: Readonly<{
  caption?: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
}>) {
  return (
    <article className="admin-spotlight rounded-xl border border-primary/10 bg-white/90 p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/20">
      <div className="mb-6 flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-secondary">{label}</p>
        <span className="grid size-10 place-items-center rounded-md bg-surface-container text-primary">{icon}</span>
      </div>
      <div className="font-body-md text-3xl font-semibold tabular-nums tracking-normal text-primary">{value}</div>
      {caption ? <p className="mt-2 text-xs leading-5 text-secondary">{caption}</p> : null}
    </article>
  );
}

export function AdminLeadBadge({ status }: Readonly<{ status: string }>) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${leadStatusTone(status)}`}>
      {leadStatusLabel(status)}
    </span>
  );
}

export function AdminRoomBadge({ status }: Readonly<{ status: string }>) {
  const label = status === "AVAILABLE" ? "Đang trống" : status === "UNAVAILABLE" ? "Đã thuê" : "Đã ẩn";
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${roomStatusTone(status)}`}>{label}</span>;
}

export function AdminBlogBadge({ status }: Readonly<{ status: string }>) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${blogStatusTone(status)}`}>
      {blogStatusLabel(status)}
    </span>
  );
}

export function AdminContactBadge({ status }: Readonly<{ status: string }>) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${contactStatusTone(status)}`}>
      {contactStatusLabel(status)}
    </span>
  );
}

export function AdminLoadingState({ label = "Đang tải dữ liệu..." }: Readonly<{ label?: string }>) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg bg-surface-container-low/70 text-secondary">
      <div className="flex items-center gap-3">
        <LoaderCircle className="animate-spin" size={20} strokeWidth={1.8} />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ rows = 6 }: Readonly<{ rows?: number }>) {
  return (
    <div aria-busy="true" aria-label="Đang tải bảng dữ liệu" className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="grid grid-cols-[2fr_1fr_1fr_96px] gap-4 rounded-md bg-surface-container-low/70 p-4" key={index}>
          <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
          <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
          <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
          <span className="h-4 animate-pulse rounded-full bg-surface-container-high" />
        </div>
      ))}
    </div>
  );
}

export function AdminEmptyState({
  action,
  description,
  title,
}: Readonly<{
  action?: ReactNode;
  description: string;
  title: string;
}>) {
  return (
    <div className="rounded-lg border border-dashed border-primary/20 bg-surface-container-low/60 p-8 text-center">
      <h3 className="font-headline-sm text-xl text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-secondary">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminInlineMessage({
  error,
  message,
}: Readonly<{
  error?: string;
  message?: string;
}>) {
  if (!error && !message) return null;

  const isError = Boolean(error);
  return (
    <div className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${isError ? "border-error/20 bg-error-container/50 text-error" : "border-success/20 bg-success-container text-success"}`}>
      {isError ? <AlertCircle className="mt-0.5 shrink-0" size={17} strokeWidth={1.8} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={17} strokeWidth={1.8} />}
      <span>{error || message}</span>
    </div>
  );
}

export function AdminPagination({
  count,
  onPageChange,
  page,
  pageSize,
}: Readonly<{
  count: number;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
}>) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = count ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(count, page * pageSize);

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-primary/10 pt-4 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
      <span>
        Hiển thị {start}-{end} / {count}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex size-9 items-center justify-center rounded-md border border-primary/10 bg-white text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft size={16} strokeWidth={1.8} />
        </button>
        <span className="px-2 tabular-nums">
          {page}/{totalPages}
        </span>
        <button
          className="inline-flex size-9 items-center justify-center rounded-md border border-primary/10 bg-white text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRight size={16} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

export const adminButtonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-secondary disabled:cursor-wait disabled:opacity-60";

export const adminButtonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-md border border-primary/10 bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 disabled:cursor-wait disabled:opacity-60";

export const adminInputClass =
  "w-full rounded-md border border-primary/10 bg-white px-3 py-2.5 text-sm text-primary shadow-sm outline-none transition placeholder:text-secondary focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

export const adminSelectClass =
  "w-full rounded-md border border-primary/10 bg-white px-3 py-2.5 text-sm text-primary shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
