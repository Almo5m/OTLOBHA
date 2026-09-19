import { createServerSupabase } from "@/lib/supabase/server";
import AgentNav from "@/components/AgentNav";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import { OrderStatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import NoOrdersIllustration from "@/components/illustrations/NoOrdersIllustration";
import IconBadge from "@/components/IconBadge";
import Link from "next/link";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AgentDashboard() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("agent_profiles").select("*").eq("user_id", user?.id).single();

  // يشمل مرحلة الشراء أيضًا وليس فقط التوصيل، لأن نفس المندوب يبدأ من لحظة
  // القبول (القسم 26) — راجع fn_pick_agent في تصميم قاعدة البيانات
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
        <div className="card mb-6 flex items-center justify-between">
          <span className="text-sm">حالتك الحالية</span>
          <AvailabilityToggle status={profile?.availability_status ?? "offline"} />
        </div>

        <h1 className="mb-4 text-xl font-bold">الطلبات المسندة إليك</h1>

        {(orders ?? []).length === 0 ? (
          <EmptyState illustration={<NoOrdersIllustration />} title="لا توجد طلبات مسندة حاليًا" description="هتظهر هنا فور تعيين طلب جديد ليك" />
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
