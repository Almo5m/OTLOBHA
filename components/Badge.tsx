type Variant = "neutral" | "accent" | "success" | "warning" | "error" | "info";

export function Badge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: Variant }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

const ORDER_STATUS: Record<string, { label: string; variant: Variant }> = {
  review: { label: "قيد المراجعة", variant: "neutral" },
  accepted: { label: "تم القبول", variant: "info" },
  rejected: { label: "مرفوض", variant: "error" },
  shopping: { label: "جارٍ الشراء", variant: "accent" },
  invoice_preparation: { label: "تجهيز الفاتورة", variant: "accent" },
  invoice_approved: { label: "فاتورة معتمدة", variant: "info" },
  ready_for_delivery: { label: "جاهز للتوصيل", variant: "info" },
  assigned: { label: "تم تعيين مندوب", variant: "accent" },
  on_the_way: { label: "في الطريق إليك", variant: "warning" },
  delivered: { label: "تم التسليم", variant: "success" },
  canceled_by_customer: { label: "ملغي منك", variant: "error" },
  canceled_by_business: { label: "ملغي من الإدارة", variant: "error" }
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, variant: "neutral" as Variant };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

const DEBT_STATUS: Record<string, { label: string; variant: Variant }> = {
  outstanding: { label: "مستحق", variant: "warning" },
  partially_settled: { label: "مسدد جزئيًا", variant: "info" },
  settled: { label: "تم السداد", variant: "success" }
};

export function DebtStatusBadge({ status }: { status: string }) {
  const s = DEBT_STATUS[status] ?? { label: status, variant: "neutral" as Variant };
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
