import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import AdminOrderActions from "@/components/AdminOrderActions";
import WhatsAppMessageButton from "@/components/WhatsAppMessageButton";
import OrderItemsList from "@/components/OrderItemsList";
import InvoiceCard from "@/components/InvoiceCard";
import OrderTimeline from "@/components/OrderTimeline";
import PaymentProofPanel from "@/components/PaymentProofPanel";
import Icon from "@/components/Icon";

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
  const { data: paymentProof } = order?.payment_method !== "cash"
    ? await supabase.from("payment_proofs").select("*").eq("order_id", params.id).maybeSingle()
    : { data: null };

  if (!order) return <main className="p-6">الطلب غير موجود.</main>;

  const draftInvoiceId = invoice && invoice.status === "draft" ? invoice.id
    : invoice && invoice.status === "approved" ? invoice.id : null;

  const event = EVENT_BY_STATUS[order.status];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-1 text-xl font-bold">طلب {order.order_number}</h1>
        <p className="mb-4 text-sm text-textSecondary">{customer?.full_name} — <span className="numeric">{customer?.phone}</span></p>

        <div className="mb-4">
          <OrderTimeline status={order.status} />
        </div>

        <div className="card mb-4 flex items-start gap-2 text-sm">
          <Icon name="location" size={16} className="mt-0.5 shrink-0 text-textSecondary" />
          <p>{order.delivery_address_snapshot?.full_address_text}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <OrderItemsList items={(items as any) ?? []} />
          {invoice && <InvoiceCard invoice={{ ...invoice, payment_method: order.payment_method }} orderNumber={order.order_number} />}
        </div>

        {paymentProof && (
          <div className="mb-4">
            <PaymentProofPanel proof={paymentProof as any} />
          </div>
        )}

        <div className="my-4">
          <AdminOrderActions orderId={order.id} status={order.status} draftInvoiceId={draftInvoiceId} />
        </div>

        {event && (
          <WhatsAppMessageButton orderId={order.id} eventKey={event.key} label={event.label} />
        )}
      </main>
    </>
  );
}
