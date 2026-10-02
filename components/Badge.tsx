type Variant = "neutral" | "accent" | "success" | "warning" | "error" | "info";

export function Badge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: Variant }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

const ORDER_STATUS: Record<string, { label: string; variant: Variant }> = {
  new_order: { label: "طلب جديد", variant: "warning" },
  shopping: { label: "جارٍ الشراء", variant: "accent" },
  on_the_way: { label: "في الطريق", variant: "info" },
  delivered: { label: "تم التسليم", variant: "success" },
  canceled_by_customer: { label: "ملغي من العميل", variant: "error" },
  canceled_by_business: { label: "ملغي من الإدارة", variant: "error" }
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, variant: "neutral" as Variant };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const COMPLAINT_STATUS: Record<string, { label: string; variant: Variant }> = {
  new: { label: "جديدة", variant: "warning" },
  under_review: { label: "قيد المراجعة", variant: "info" },
  resolved: { label: "تم الحل", variant: "success" },
  closed: { label: "مغلقة", variant: "neutral" }
};

export function ComplaintStatusBadge({ status }: { status: string }) {
  const s = COMPLAINT_STATUS[status] ?? { label: status, variant: "neutral" as Variant };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
