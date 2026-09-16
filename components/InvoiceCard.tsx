import Icon from "./Icon";
import { Badge } from "./Badge";

type Invoice = {
  invoice_number: string;
  items_total: number;
  delivery_fee: number;
  previous_debt_included: number;
  grand_total: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  created_at?: string;
};

const PAYMENT_LABELS: Record<string, string> = { cash: "كاش", wallet: "محفظة إلكترونية", instapay: "InstaPay" };

export default function InvoiceCard({ invoice, orderNumber }: { invoice: Invoice; orderNumber: string }) {
  return (
    <div className="card overflow-hidden p-0">
      {/* رأس الفاتورة — يبدو رسميًا وواضحًا */}
      <div className="flex items-center justify-between border-b border-borderc bg-surfaceElevated px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Icon name="invoice" size={17} className="text-textSecondary" />
          <span className="numeric font-bold">{invoice.invoice_number}</span>
        </div>
        <span className="numeric text-xs text-textSecondary">طلب {orderNumber}</span>
      </div>

      <div className="space-y-1.5 px-5 py-4 text-sm">
        <div className="flex justify-between">
          <span className="text-textSecondary">إجمالي المنتجات</span>
          <span className="numeric">{invoice.items_total} ج.م</span>
        </div>
        <div className="flex justify-between">
          <span className="text-textSecondary">رسوم التوصيل</span>
          <span className="numeric">{invoice.delivery_fee} ج.م</span>
        </div>
        {invoice.previous_debt_included > 0 && (
          <div className="flex justify-between">
            <span className="text-warning">مديونية سابقة</span>
            <span className="numeric text-warning">{invoice.previous_debt_included} ج.م</span>
          </div>
        )}
      </div>

      {/* الإجمالي النهائي — أبرز عنصر في الفاتورة */}
      <div className="flex items-center justify-between border-y-2 border-ink px-5 py-3.5">
        <span className="font-bold">الإجمالي النهائي</span>
        <span className="numeric text-xl font-extrabold">{invoice.grand_total} ج.م</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3.5 text-xs">
        {invoice.payment_method && <Badge variant="neutral">{PAYMENT_LABELS[invoice.payment_method] ?? invoice.payment_method}</Badge>}
        <Badge variant={invoice.status === "approved" ? "success" : invoice.status === "canceled" ? "error" : "neutral"}>
          {invoice.status === "approved" ? "معتمدة" : invoice.status === "canceled" ? "ملغاة (تم تصحيحها)" : "مسودة"}
        </Badge>
        <Badge variant={invoice.payment_status === "paid" ? "success" : "warning"}>
          {invoice.payment_status === "paid" ? "مدفوعة" : "غير مدفوعة"}
        </Badge>
      </div>
    </div>
  );
}
