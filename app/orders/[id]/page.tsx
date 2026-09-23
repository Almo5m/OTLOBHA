import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import OrderActions from "@/components/OrderActions";
import OrderTimeline from "@/components/OrderTimeline";
import OrderItemsList from "@/components/OrderItemsList";
import InvoiceCard from "@/components/InvoiceCard";
import { Badge } from "@/components/Badge";
import Icon from "@/components/Icon";
import Link from "next/link";
import ContactSupportLink from "@/components/ContactSupportLink";
import OrderRealtimeRefresher from "@/components/OrderRealtimeRefresher";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*, products!order_items_product_id_fkey(name), sale_units(name)")
    .eq("order_id", id);
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: rating } = await supabase.from("ratings").select("id").eq("order_id", id).maybeSingle();
  const { data: paymentProof } = order?.payment_method !== "cash"
    ? await supabase.from("payment_proofs").select("status").eq("order_id", id).maybeSingle()
    : { data: null };

  if (!order) {
    return <main className="p-6">الطلب غير موجود.</main>;
  }

  return (
    <>
      <CustomerNav />
      <OrderRealtimeRefresher orderId={id} />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6 lg:max-w-4xl">
        <h1 className="mb-1 text-xl font-bold">طلب {order.order_number}</h1>
        {itemsError && <p className="alert alert-error mb-4 text-sm">تعذّر تحميل أصناف الطلب: {itemsError.message}</p>}
        <p className="numeric mb-6 text-sm text-textSecondary">
          {new Date(order.created_at).toLocaleString("ar-EG")}
        </p>

        <div className="mb-4">
          <OrderTimeline status={order.status} />
        </div>

        {paymentProof && (
          <div className="alert alert-info mb-4 flex flex-wrap items-center gap-2">
            <Icon name="wallet" size={16} className="shrink-0" />
            <span>حالة التحويل: </span>
            <Badge variant={paymentProof.status === "verified" ? "success" : paymentProof.status === "rejected" ? "error" : "warning"}>
              {paymentProof.status === "verified" ? "تم التأكيد" : paymentProof.status === "rejected" ? "مرفوض" : "بانتظار المراجعة"}
            </Badge>
            {paymentProof.status === "rejected" && (
              <ContactSupportLink
                label="تواصل معانا"
                message={`مرحبًا، إثبات الدفع بتاع طلبي ${order.order_number} اتعمله رفض وعايز أستفسر عن السبب.`}
              />
            )}
          </div>
        )}

        {order.status === "rejected" && (
          <div className="mb-4 alert alert-error">
            تم رفض الطلب. السبب: {order.rejection_reason}
          </div>
        )}
        {order.status?.startsWith("canceled") && (
          <div className="mb-4 alert alert-error">
            تم إلغاء الطلب. السبب: {order.cancellation_reason || "غير محدد"}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <OrderItemsList items={(items as any) ?? []} />
          {invoice && <InvoiceCard invoice={{ ...invoice, payment_method: order.payment_method }} orderNumber={order.order_number} />}
        </div>

        <div className="mt-4">
          <OrderActions orderId={order.id} status={order.status} hasRating={!!rating} />
        </div>

        {order.status === "delivered" && (
          <Link href={`/complaints?order=${order.id}`} className="mt-4 block text-center text-sm text-textSecondary underline">
            تقديم شكوى بخصوص هذا الطلب
          </Link>
        )}
      </main>
    </>
  );
}
