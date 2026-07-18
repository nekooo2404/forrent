type BadgeType = "room" | "blog" | "lead";

interface StatusBadgeProps {
  status: string;
  type: BadgeType;
}

const roomStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "bg-surface-variant/95 text-on-surface" },
  PENDING_REVIEW: { label: "Chờ duyệt", className: "bg-warning-container text-on-warning" },
  PUBLISHED: { label: "Còn trống", className: "border border-tertiary/20 bg-tertiary-container text-on-tertiary-container" },
  RENTED: { label: "Đã thuê", className: "bg-surface-variant/95 text-on-surface" },
  HIDDEN: { label: "Đã ẩn", className: "bg-surface-variant/70 text-on-surface" },
  ARCHIVED: { label: "Lưu trữ", className: "bg-surface-variant/70 text-on-surface" },
};

const blogStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-surface-variant text-on-surface" },
  PUBLISHED: { label: "Đã xuất bản", className: "bg-tertiary-container text-on-tertiary-container" },
  HIDDEN: { label: "Đã ẩn", className: "bg-warning text-on-warning" },
};

const leadStatusConfig: Record<string, { label: string; className: string }> = {
  NEW: { label: "Mới gửi", className: "bg-primary text-on-primary" },
  CONTACTED: { label: "Đã liên hệ", className: "bg-secondary text-on-secondary" },
  SCHEDULED: { label: "Đã lên lịch", className: "bg-primary text-on-primary" },
  VIEWED: { label: "Đã xem", className: "bg-warning text-on-warning" },
  CONVERTED: { label: "Đã chốt thuê", className: "bg-success text-on-success" },
  NO_SHOW: { label: "Không đến xem", className: "bg-surface-variant text-on-surface" },
  CANCELLED: { label: "Đã hủy", className: "bg-error text-on-error" },
};

const statusConfigs = {
  room: roomStatusConfig,
  blog: blogStatusConfig,
  lead: leadStatusConfig,
};

export function StatusBadge({ status, type }: Readonly<StatusBadgeProps>) {
  const config = statusConfigs[type][status] || { label: status, className: "bg-surface-variant text-on-surface" };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 font-label-caps text-label-caps uppercase shadow-sm ${config.className}`}>
      {config.label}
    </span>
  );
}
