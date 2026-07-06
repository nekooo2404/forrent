type BadgeType = "room" | "lead" | "blog" | "contact" | "payout";

interface StatusBadgeProps {
  status: string;
  type: BadgeType;
}

const roomStatusConfig: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Còn trống", className: "bg-emerald-500 text-white" },
  UNAVAILABLE: { label: "Đã thuê", className: "bg-surface-variant text-on-surface" },
  HIDDEN: { label: "Đã ẩn", className: "bg-surface-variant/70 text-on-surface" },
};

const leadStatusConfig: Record<string, { label: string; className: string }> = {
  NEW: { label: "Mới", className: "bg-blue-500 text-white" },
  CONTACTED: { label: "Đã liên hệ", className: "bg-purple-500 text-white" },
  VIEWED: { label: "Đã xem", className: "bg-amber-500 text-white" },
  MOVED_IN: { label: "Đã chuyển vào", className: "bg-emerald-500 text-white" },
  NOT_MOVED_IN: { label: "Không chuyển vào", className: "bg-gray-500 text-white" },
  CANCELLED: { label: "Đã hủy", className: "bg-error text-white" },
};

const blogStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-surface-variant text-on-surface" },
  PUBLISHED: { label: "Đã xuất bản", className: "bg-success text-white" },
  HIDDEN: { label: "Đã ẩn", className: "bg-warning text-on-warning" },
};

const contactStatusConfig: Record<string, { label: string; className: string }> = {
  NEW: { label: "Mới", className: "bg-blue-500 text-white" },
  READ: { label: "Đã đọc", className: "bg-purple-500 text-white" },
  HANDLED: { label: "Đã xử lý", className: "bg-success text-white" },
};

const payoutStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ duyệt", className: "bg-warning text-on-warning" },
  APPROVED: { label: "Đã duyệt", className: "bg-blue-500 text-white" },
  PAID: { label: "Đã thanh toán", className: "bg-success text-white" },
  CANCELLED: { label: "Đã hủy", className: "bg-error text-white" },
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
