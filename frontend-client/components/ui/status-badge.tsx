type BadgeType = "room" | "blog";

interface StatusBadgeProps {
  status: string;
  type: BadgeType;
}

const roomStatusConfig: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Còn trống", className: "bg-emerald-500 text-white" },
  UNAVAILABLE: { label: "Đã thuê", className: "bg-surface-variant/95 text-on-surface" },
  HIDDEN: { label: "Đã ẩn", className: "bg-surface-variant/70 text-on-surface" },
};

const blogStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-surface-variant text-on-surface" },
  PUBLISHED: { label: "Đã xuất bản", className: "bg-success text-white" },
  HIDDEN: { label: "Đã ẩn", className: "bg-warning text-on-warning" },
};

const statusConfigs = {
  room: roomStatusConfig,
  blog: blogStatusConfig,
};

export function StatusBadge({ status, type }: Readonly<StatusBadgeProps>) {
  const config = statusConfigs[type][status] || { label: status, className: "bg-surface-variant text-on-surface" };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 font-label-caps text-label-caps uppercase tracking-wider shadow-sm ${config.className}`}>
      {config.label}
    </span>
  );
}
