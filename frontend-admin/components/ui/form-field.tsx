import type { ReactNode } from "react";
import { AlertCircle } from "@/components/ui/icons";

interface FormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function FormField({ label, error, helperText, required, children, htmlFor }: Readonly<FormFieldProps>) {
  return (
    <div className="w-full">
      <label className="mb-2 block text-xs font-semibold uppercase text-secondary" htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-1 text-error">*</span>}
      </label>
      {children}
      <div className="mt-1 min-h-5">
        {error ? (
          <div className="flex items-start gap-1.5 text-error">
            <AlertCircle className="mt-0.5 shrink-0" size={14} strokeWidth={1.8} />
            <p className="text-xs leading-snug">{error}</p>
          </div>
        ) : helperText ? (
          <p className="text-xs text-secondary">{helperText}</p>
        ) : null}
      </div>
    </div>
  );
}
