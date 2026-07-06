import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

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
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

  const variantStyles = {
    primary: "bg-primary text-on-primary shadow-sm hover:bg-secondary",
    secondary: "border border-primary/10 bg-surface-container-lowest text-primary shadow-sm hover:border-primary/30",
    ghost: "text-primary hover:bg-surface-container-low",
    danger: "bg-error text-white shadow-sm hover:bg-error/90",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="animate-spin" size={size === "sm" ? 14 : size === "lg" ? 20 : 16} strokeWidth={1.8} />
      ) : icon ? (
        icon
      ) : null}
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}
