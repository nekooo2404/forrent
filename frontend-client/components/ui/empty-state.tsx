import type { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export function EmptyState({ icon, title, description, action, secondaryAction }: Readonly<EmptyStateProps>) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest p-8 text-center shadow-soft md:p-10">
      {icon && <div className="mb-4 flex justify-center text-secondary">{icon}</div>}
      <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
      <p className="mx-auto mt-3 max-w-md font-body-md text-body-md leading-relaxed text-on-surface-variant">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {action && (
            <>
              {action.href ? (
                <Link
                  className={`premium-button inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 font-button text-button ${
                    action.variant === "secondary"
                      ? "border border-primary px-5 py-3 text-primary"
                      : "urban-cta"
                  }`}
                  href={action.href}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  className={`premium-button inline-flex min-h-11 items-center justify-center rounded-md px-5 py-3 font-button text-button ${
                    action.variant === "secondary"
                      ? "border border-primary px-5 py-3 text-primary"
                      : "urban-cta"
                  }`}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              )}
            </>
          )}
          {secondaryAction && (
            <>
              {secondaryAction.href ? (
                <Link
                  className="premium-button inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-5 py-3 font-button text-button text-on-surface"
                  href={secondaryAction.href}
                >
                  {secondaryAction.label}
                </Link>
              ) : (
                <button
                  className="premium-button inline-flex min-h-11 items-center justify-center rounded-md border border-outline-variant/70 px-5 py-3 font-button text-button text-on-surface"
                  onClick={secondaryAction.onClick}
                  type="button"
                >
                  {secondaryAction.label}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
