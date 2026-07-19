import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "@/components/ui/icons";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const baseStyles = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-button text-button transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";
const variantStyles = {
  danger: "bg-error text-on-error hover:bg-error/90",
  ghost: "text-primary hover:bg-surface-container-low",
  primary: "bg-primary text-on-primary hover:bg-surface-tint",
  secondary: "border border-primary/20 bg-transparent text-primary hover:bg-surface-container-low",
};
const sizeStyles = {
  lg: "px-6 py-4 text-base",
  md: "px-4 py-4 text-sm",
  sm: "px-3 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="animate-spin" size={size === "sm" ? 14 : size === "lg" ? 20 : 18} strokeWidth={1.8} />
      ) : icon ? (
        icon
      ) : null}
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}
