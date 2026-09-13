import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import AdminOrderActions from "@/components/AdminOrderActions";
import WhatsAppMessageButton from "@/components/WhatsAppMessageButton";

const EVENT_BY_STATUS: Record<string, { key: string; label: string }> = {
  accepted: { key: "order_accepted", label: "إرسال رسالة: تم قبول الطلب" },
  rejected: { key: "order_rejected", label: "إرسال رسالة: تم رفض الطلب" },
  invoice_approved: { key: "invoice_ready", label: "إرسال رسالة: الفاتورة جاهزة" },
  on_the_way: { key: "on_the_way", label: "إرسال رسالة: المندوب في الطريق" },
  delivered: { key: "delivered", label: "إرسال رسالة: تم التسليم" },
  canceled_by_business: { key: "order_canceled", label: "إرسال رسالة: تم إلغاء الطلب" },
  canceled_by_customer: { key: "order_canceled", label: "إرسال رسالة: تأكيد الإلغاء" }
};

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: order } = await supabase.from("orders").select("*").eq("id", params.id).single();
  const { data: customer } = order
    ? await supabase.from("users").select("full_name,phone").eq("id", order.customer_id).single()
    : { data: null };
  const { data: items } = await supabase
    .from("order_items")
    .select("*, products(name), sale_units(name)")
    .eq("order_id", params.id);
  const { data: invoice } = await supabase
    .from("invoices").select("*").eq("order_id", params.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!order) return <main className="p-6">الطلب غير موجود.</main>;

  const draftInvoiceId = invoice && invoice.status === "draft" ? invoice.id
    : invoice && invoice.status === "approved" ? invoice.id : null;

  const event = EVENT_BY_STATUS[order.status];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-xl font-bold">طلب {order.order_number}</h1>
        <p className="mb-4 text-sm text-textSecondary">{customer?.full_name} — {customer?.phone}</p>

        <div className="card mb-4 text-sm">
          <p><strong>العنوان:</strong> {order.delivery_address_snapshot?.full_address_text}</p>
          <p><strong>طريقة الدفع:</strong> {order.payment_method}</p>
          {order.assigned_agent_id && <p><strong>المندوب المُسند:</strong> يمكن مراجعته من قسم المندوبين</p>}
        </div>

        <div className="card mb-4">
          <h2 className="mb-3 font-medium">الأصناف</h2>
          <div className="space-y-2 text-sm">
            {(items ?? []).map((it: any) => (
              <div key={it.id} className="flex justify-between border-b border-line/50 pb-2">
                <span>{it.products?.name ?? it.manual_name} — {it.quantity} {it.sale_units?.name}</span>
                <span>{it.is_available === false ? "غير متوفر" : it.actual_price != null ? `${it.actual_price} ج.م` : "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {invoice && (
          <div className="card mb-4 text-sm">
            <h2 className="mb-2 font-medium">الفاتورة {invoice.invoice_number} ({invoice.status})</h2>
            <p>الإجمالي: {invoice.grand_total} ج.م — الدفع: {invoice.payment_status}</p>
          </div>
        )}

        <div className="mb-4">
          <AdminOrderActions orderId={order.id} status={order.status} draftInvoiceId={draftInvoiceId} />
        </div>

        {event && (
          <WhatsAppMessageButton orderId={order.id} eventKey={event.key} label={event.label} />
        )}
      </main>
    </>
  );
}
