type BadgeType = "room" | "lead" | "blog" | "contact" | "payout";

interface StatusBadgeProps {
  status: string;
  type: BadgeType;
}

const roomStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Bản nháp", className: "bg-surface-variant text-on-surface" },
  PENDING_REVIEW: { label: "Chờ duyệt", className: "bg-warning text-on-warning" },
  PUBLISHED: { label: "Còn trống", className: "bg-success text-on-success" },
  RENTED: { label: "Đã thuê", className: "bg-surface-variant text-on-surface" },
  HIDDEN: { label: "Đã ẩn", className: "bg-surface-variant/70 text-on-surface" },
  ARCHIVED: { label: "Lưu trữ", className: "bg-surface-variant/70 text-on-surface" },
};

const leadStatusConfig: Record<string, { label: string; className: string }> = {
  NEW: { label: "Mới", className: "bg-primary text-on-primary" },
  CONTACTED: { label: "Đã liên hệ", className: "bg-secondary text-on-secondary" },
  SCHEDULED: { label: "Đã lên lịch", className: "bg-primary text-on-primary" },
  VIEWED: { label: "Đã xem", className: "bg-warning text-on-warning" },
  CONVERTED: { label: "Đã chốt thuê", className: "bg-success text-on-success" },
  NO_SHOW: { label: "Không đến xem", className: "bg-surface-variant text-on-surface" },
  CANCELLED: { label: "Đã hủy", className: "bg-error text-on-error" },
};

const blogStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-surface-variant text-on-surface" },
  PUBLISHED: { label: "Đã xuất bản", className: "bg-success text-on-success" },
  HIDDEN: { label: "Đã ẩn", className: "bg-warning text-on-warning" },
};

const contactStatusConfig: Record<string, { label: string; className: string }> = {
  NEW: { label: "Mới", className: "bg-primary text-on-primary" },
  READ: { label: "Đã đọc", className: "bg-secondary text-on-secondary" },
  HANDLED: { label: "Đã xử lý", className: "bg-success text-on-success" },
};

const payoutStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-warning text-on-warning" },
  APPROVED: { label: "Đã duyệt", className: "bg-primary text-on-primary" },
  PAID: { label: "Đã thanh toán", className: "bg-success text-on-success" },
  CANCELLED: { label: "Đã hủy", className: "bg-error text-on-error" },
};

const statusConfigs = {
  room: roomStatusConfig,
  lead: leadStatusConfig,
  blog: blogStatusConfig,
  contact: contactStatusConfig,
  payout: payoutStatusConfig,
};

export function StatusBadge({ status, type }: Readonly<StatusBadgeProps>) {
  const config = statusConfigs[type][status] || { label: status, className: "bg-surface-variant text-on-surface" };

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  );
}
