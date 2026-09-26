import { createServerSupabase } from "@/lib/supabase/server";
import AgentNav from "@/components/AgentNav";
import ClaimOrderButton from "@/components/ClaimOrderButton";
import { OrderStatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import NoOrdersIllustration from "@/components/illustrations/NoOrdersIllustration";
import IconBadge from "@/components/IconBadge";
import Link from "next/link";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AgentDashboard() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // الطلبات المتاحة لأي مندوب يقبلها — أول واحد يضغط "قبول الطلب" هو
  // اللي بياخدها (راجع claim_order في تصميم قاعدة البيانات، القسم 30)
  const { data: openOrders } = await supabase
    .from("orders")
    .select("id,order_number,status,delivery_address_snapshot,created_at")
    .is("assigned_agent_id", null)
    .in("status", ["shopping", "ready_for_delivery"])
    .order("created_at");

  // يشمل مرحلة الشراء أيضًا وليس فقط التوصيل، لأن نفس المندوب يبدأ من لحظة
  // ما يستلم الطلب (claim_order) لحد ما يسلّمه
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_number,status,delivery_address_snapshot")
    .eq("assigned_agent_id", user?.id)
    .in("status", ["shopping", "invoice_preparation", "assigned", "on_the_way"])
    .order("created_at");

  return (
    <>
      <AgentNav />
      <RealtimeRefresher tables={["orders", "agent_profiles"]} channelName="agent-dashboard" />
      <main className="mx-auto max-w-2xl px-4 py-6">
        {(openOrders ?? []).length > 0 && (
          <div className="mb-8">
            <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
              <IconBadge name="delivery" size="sm" /> طلبات متاحة للاستلام
            </h1>
            <p className="mb-4 text-xs text-textSecondary">دي طلبات مفيش مندوب استلمها لسه — أي مندوب يقدر ياخدها، وأول واحد يضغط هو اللي بياخدها.</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {(openOrders ?? []).map((o: any) => (
                <div key={o.id} className="card animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="numeric font-medium">{o.order_number}</p>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-textSecondary">{o.delivery_address_snapshot?.full_address_text}</p>
                  <ClaimOrderButton orderId={o.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="mb-4 text-xl font-bold">الطلبات المسندة إليك</h2>

        {(orders ?? []).length === 0 ? (
          <EmptyState illustration={<NoOrdersIllustration />} title="لا توجد طلبات مسندة حاليًا" description="اقبل طلب من القائمة فوق (لو فيه طلبات متاحة) وهيظهر هنا" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {(orders ?? []).map((o: any) => (
              <Link key={o.id} href={`/agent/orders/${o.id}`} className="card card-interactive flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-3">
                  <IconBadge name={o.status === "shopping" || o.status === "invoice_preparation" ? "cart" : "delivery"} size="sm" />
                  <div>
                    <p className="numeric font-medium">{o.order_number}</p>
                    <p className="text-xs text-textSecondary">{o.delivery_address_snapshot?.full_address_text}</p>
                  </div>
                </div>
                <OrderStatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
