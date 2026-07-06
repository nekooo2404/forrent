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
    <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low/30 p-10 text-center">
      {icon && <div className="mb-4 flex justify-center text-secondary">{icon}</div>}
      <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
      <p className="mx-auto mt-3 max-w-md font-body-md text-body-md leading-relaxed text-on-surface-variant">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {action && (
            <>
              {action.href ? (
                <Link
                  className={`premium-button inline-flex rounded-xl px-5 py-3 font-button text-button ${
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
                  className={`premium-button inline-flex rounded-xl px-5 py-3 font-button text-button ${
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
                  className="premium-button inline-flex rounded-xl border border-primary/20 px-5 py-3 font-button text-button text-primary"
                  href={secondaryAction.href}
                >
                  {secondaryAction.label}
                </Link>
              ) : (
                <button
                  className="premium-button inline-flex rounded-xl border border-primary/20 px-5 py-3 font-button text-button text-primary"
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
