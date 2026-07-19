"use client";

import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "@/components/ui/icons";
import { useRef } from "react";

interface ToastProps {
  type: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  onClose: () => void;
}

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: "border-success/20 bg-success-container text-success",
  error: "border-error/20 bg-error-container text-error",
  info: "border-primary/20 bg-primary-container text-primary",
  warning: "border-warning/20 bg-warning-container text-warning",
};

export function Toast({ type, title, message, onClose }: Readonly<ToastProps>) {
  const Icon = iconMap[type];
  const pointerStart = useRef<number | null>(null);

  return (
    <div
      className={`scroll-reveal pointer-events-auto flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-lg border p-4 shadow-elevated ${colorMap[type]}`}
      onPointerDown={(event) => {
        pointerStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStart.current !== null && event.clientX - pointerStart.current > 100) onClose();
        pointerStart.current = null;
      }}
    >
      <Icon className="mt-0.5 shrink-0" size={20} strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-sm">{title}</p>}
        <p className="text-sm leading-snug">{message}</p>
      </div>
      <button
        aria-label="Đóng thông báo"
        className="shrink-0 transition-opacity hover:opacity-70"
        onClick={onClose}
        type="button"
      >
        <X size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
