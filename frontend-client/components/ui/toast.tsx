"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

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

  return (
    <motion.div
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={`pointer-events-auto flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-lg border p-4 shadow-elevated ${colorMap[type]}`}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) onClose();
      }}
      transition={{ duration: 0.3 }}
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
    </motion.div>
  );
}
