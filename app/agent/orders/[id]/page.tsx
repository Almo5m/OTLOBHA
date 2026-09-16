import { createServerSupabase } from "@/lib/supabase/server";
import AgentNav from "@/components/AgentNav";
import ShoppingForm from "@/components/ShoppingForm";
import DeliveryActions from "@/components/DeliveryActions";
import Icon from "@/components/Icon";

export default async function AgentOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: order } = await supabase.from("orders").select("*").eq("id", params.id).single();
  const { data: items } = await supabase
    .from("order_items")
    .select("*, products(name), sale_units(name)")
    .eq("order_id", params.id);
  const { data: customer } = order
    ? await supabase.from("users").select("full_name,phone").eq("id", order.customer_id).single()
    : { data: null };

  if (!order) return <main className="p-6">الطلب غير موجود.</main>;

  return (
    <>
      <AgentNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <Icon name={order.status === "shopping" ? "cart" : "delivery"} size={19} className="text-textSecondary" />
          طلب {order.order_number}
        </h1>
        <p className="mb-4 text-sm text-textSecondary">
          {customer?.full_name} — <span className="numeric">{customer?.phone}</span>
        </p>
        <div className="card mb-4 flex items-start gap-2 text-sm">
          <Icon name="location" size={16} className="mt-0.5 shrink-0 text-textSecondary" />
          <div>
            <p className="font-medium">عنوان التسليم</p>
            <p className="text-textSecondary">{order.delivery_address_snapshot?.full_address_text}</p>
          </div>
        </div>

        {order.status === "shopping" && (
          <ShoppingForm orderId={order.id} items={items ?? []} />
        )}

        {(order.status === "assigned" || order.status === "on_the_way") && (
          <DeliveryActions orderId={order.id} status={order.status} />
        )}

        {!["shopping", "assigned", "on_the_way"].includes(order.status) && (
          <p className="text-sm text-textSecondary">لا توجد إجراءات متاحة على هذا الطلب في حالته الحالية.</p>
        )}
      </main>
    </>
  );
}
