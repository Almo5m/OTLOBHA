import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import OrderActions from "@/components/OrderActions";
import OrderTimeline from "@/components/OrderTimeline";
import Link from "next/link";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: order } = await supabase.from("orders").select("*").eq("id", params.id).single();
  const { data: items } = await supabase
    .from("order_items")
    .select("*, products(name), sale_units(name)")
    .eq("order_id", params.id);
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("order_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: rating } = await supabase.from("ratings").select("id").eq("order_id", params.id).maybeSingle();

  if (!order) {
    return <main className="p-6">الطلب غير موجود.</main>;
  }

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6 lg:max-w-4xl">
        <h1 className="mb-1 text-xl font-bold">طلب {order.order_number}</h1>
        <p className="mb-6 text-sm text-textSecondary">
          {new Date(order.created_at).toLocaleString("ar-EG")}
        </p>

        <div className="mb-4">
          <OrderTimeline status={order.status} />
        </div>

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

        <div className="card mb-4">
          <h2 className="mb-3 font-medium">الأصناف</h2>
          <div className="space-y-2 text-sm">
            {(items ?? []).map((it: any) => (
              <div key={it.id} className="flex items-center justify-between border-b border-line/50 pb-2">
                <div>
                  <p>{it.products?.name ?? it.manual_name}</p>
                  <p className="text-xs text-textSecondary">{it.quantity} {it.sale_units?.name}</p>
                </div>
                {it.is_available === false ? (
                  <span className="text-xs text-error">غير متوفر</span>
                ) : it.actual_price != null ? (
                  <span>{it.actual_price} ج.م</span>
                ) : (
                  <span className="text-xs text-textSecondary">لم يُشترى بعد</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {invoice && (
          <div className="card mb-4">
            <h2 className="mb-3 font-medium">الفاتورة {invoice.invoice_number}</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>إجمالي المنتجات</span><span>{invoice.items_total} ج.م</span></div>
              <div className="flex justify-between"><span>رسوم التوصيل</span><span>{invoice.delivery_fee} ج.م</span></div>
              {invoice.previous_debt_included > 0 && (
                <div className="flex justify-between text-accent"><span>مديونية سابقة</span><span>{invoice.previous_debt_included} ج.م</span></div>
              )}
              <div className="mt-2 flex justify-between border-t border-line pt-2 font-bold">
                <span>الإجمالي</span><span>{invoice.grand_total} ج.م</span>
              </div>
              <p className="mt-2 text-xs text-textSecondary">
                حالة الفاتورة: {invoice.status === "approved" ? "معتمدة" : invoice.status === "canceled" ? "ملغاة (تم تصحيحها)" : "مسودة"}
                {" — "}حالة الدفع: {invoice.payment_status === "paid" ? "مدفوعة" : "غير مدفوعة"}
              </p>
            </div>
          </div>
        )}

        <OrderActions orderId={order.id} status={order.status} hasRating={!!rating} />

        {order.status === "delivered" && (
          <Link href={`/complaints?order=${order.id}`} className="mt-4 block text-center text-sm text-textSecondary underline">
            تقديم شكوى بخصوص هذا الطلب
          </Link>
        )}
      </main>
    </>
  );
}
