import { createServerSupabase } from "@/lib/supabase/server";
import { OrderStatusBadge } from "@/components/Badge";
import OrderTimeline from "@/components/OrderTimeline";
import OrderItemsList from "@/components/OrderItemsList";
import StaffOrderActions from "@/components/StaffOrderActions";
import InvoiceSender from "@/components/InvoiceSender";
import WhatsAppMessageButton from "@/components/WhatsAppMessageButton";
import OrderRealtimeRefresher from "@/components/OrderRealtimeRefresher";
import Icon from "@/components/Icon";
import { googleMapsUrl, toInternationalEgyptPhone } from "@/lib/whatsapp";

const METHOD_LABEL: Record<string, string> = { cash: "كاش عند الاستلام", wallet: "محفظة إلكترونية", instapay: "InstaPay" };

/** صفحة تفاصيل الطلب المشتركة بين المندوب والأدمن والسوبر أدمن — نفس الخطوات للجميع. */
export default async function StaffOrderDetail({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return <main className="p-6">الطلب غير موجود (أو اتاخد من إداري تاني).</main>;

  const [{ data: items }, { data: invoice }, { data: templates }, { data: me }, { data: agent }, { data: rating }] = await Promise.all([
    supabase.from("order_items")
      .select("*, products!order_items_product_id_fkey(name), sale_units(name)")
      .eq("order_id", id).order("created_at"),
    supabase.from("invoices").select("id,image_url,invoice_number,grand_total").eq("order_id", id).maybeSingle(),
    supabase.from("whatsapp_templates").select("event_key,body_text").eq("is_active", true),
    supabase.from("users").select("full_name").eq("id", user!.id).single(),
    order.assigned_agent_id
      ? supabase.from("users").select("full_name").eq("id", order.assigned_agent_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("ratings").select("stars").eq("order_id", id).maybeSingle()
  ]);

  const tpl = Object.fromEntries((templates ?? []).map((t) => [t.event_key, t.body_text as string]));
  const assignedToMe = order.assigned_agent_id === user!.id;
  const itemsTotal = (items ?? []).filter((i: any) => i.is_available).reduce((sum: number, i: any) => sum + Number(i.actual_price ?? 0) * Number(i.quantity ?? 1), 0);
  const canceled = order.status.startsWith("canceled");
  const phoneIntl = toInternationalEgyptPhone(order.customer_phone);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-24">
      <OrderRealtimeRefresher orderId={id} />

      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Icon name="orders" size={20} className="text-textSecondary" /> طلب <span className="numeric">{order.order_number}</span>
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <OrderTimeline status={order.status} />

      <div className="card space-y-2 text-sm">
        <p className="font-medium">{order.customer_name}</p>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:+${phoneIntl}`} className="btn-secondary px-3 py-1.5 text-sm"><span className="numeric" dir="ltr">{order.customer_phone}</span> — اتصال</a>
          <a href={`https://wa.me/${phoneIntl}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1.5 text-sm">واتساب</a>
        </div>
        <div className="flex items-start gap-2 pt-1">
          <Icon name="location" size={16} className="mt-0.5 shrink-0 text-textSecondary" />
          <div>
            <p className="text-textSecondary">{order.address_text}</p>
            {order.location_lat != null && (
              <a href={googleMapsUrl(order.location_lat, order.location_lng)} target="_blank" rel="noreferrer"
                className="text-xs text-accent underline underline-offset-2">افتح اللوكيشن على الخريطة</a>
            )}
          </div>
        </div>
        {order.customer_notes && <p className="rounded-lg bg-surfaceElevated px-3 py-2 text-textSecondary">ملاحظات العميل: {order.customer_notes}</p>}
        <p className="text-xs text-textSecondary">
          الدفع: {METHOD_LABEL[order.payment_method]} · رسوم التوصيل: <span className="numeric">{order.delivery_fee_applied}</span> ج.م
          {order.assigned_agent_id && <> · مع: {agent?.full_name}</>}
        </p>
        {order.payment_proof_url && (
          <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline underline-offset-2">شوف صورة إثبات التحويل</a>
        )}
      </div>

      <OrderItemsList items={(items ?? []) as any} />

      {order.status !== "new_order" && itemsTotal > 0 && !canceled && (
        <div className="card flex items-center justify-between text-sm">
          <span className="text-textSecondary">الإجمالي حتى الآن (أصناف + توصيل)</span>
          <span className="numeric font-bold">{itemsTotal + Number(order.delivery_fee_applied)} ج.م</span>
        </div>
      )}

      {!canceled && order.status !== "delivered" && (
        <StaffOrderActions
          order={{
            id: order.id, status: order.status, order_number: order.order_number, tracking_token: order.tracking_token,
            customer_name: order.customer_name, customer_phone: order.customer_phone,
            tracking_message_sent_at: order.tracking_message_sent_at,
            assigned_to_me: assignedToMe, assigned_agent_name: agent?.full_name ?? null
          }}
          items={(items ?? []) as any}
          isAdmin={isAdmin}
          claimedTemplate={tpl.order_claimed ?? null}
          currentUserName={me?.full_name ?? ""}
        />
      )}

      {order.status === "delivered" && invoice && (assignedToMe || isAdmin) && (
        <InvoiceSender invoiceId={invoice.id} orderId={order.id} imageUrl={invoice.image_url}
          invoiceTemplate={tpl.invoice_sent ?? null} trackingToken={order.tracking_token} />
      )}
      {order.status === "delivered" && rating && (
        <p className="text-sm text-textSecondary">تقييم العميل: <span className="numeric font-medium">{rating.stars}</span> / 5</p>
      )}

      {canceled && (
        <div className="card space-y-2 text-sm">
          <p className="text-error">سبب الإلغاء: {order.cancellation_reason ?? "—"}</p>
          <WhatsAppMessageButton phone={order.customer_phone} template={tpl.order_canceled ?? null} trackingToken={order.tracking_token}
            vars={{ customer_name: order.customer_name, order_number: order.order_number, cancellation_reason: order.cancellation_reason }}
            label="إبلاغ العميل بالإلغاء على واتساب" />
        </div>
      )}
    </main>
  );
}
