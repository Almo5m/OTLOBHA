import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import ClaimOrderButton from "@/components/ClaimOrderButton";
import { OrderStatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import NoOrdersIllustration from "@/components/illustrations/NoOrdersIllustration";
import IconBadge from "@/components/IconBadge";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import PollRefresher from "@/components/PollRefresher";

/** لوحة الطلبات المشتركة: الطلبات الجديدة المتاحة للكل + طلباتي الجارية. بتتحدّث لحظيًا. */
export default async function OpenOrdersBoard({ basePath }: { basePath: "/admin/orders" | "/agent/orders" }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: open }, { data: mine }] = await Promise.all([
    supabase.from("orders")
      .select("id,order_number,customer_name,address_text,created_at,order_items(count)")
      .eq("status", "new_order").is("assigned_agent_id", null)
      .order("created_at"),
    supabase.from("orders")
      .select("id,order_number,customer_name,address_text,status")
      .eq("assigned_agent_id", user!.id).in("status", ["shopping", "on_the_way"])
      .order("created_at")
  ]);

  return (
    <>
      <RealtimeRefresher tables={["orders"]} channelName={`board-${basePath}`} />
      {/* Realtime مبيبعتش حدث لما الطلب يختفي من صلاحية الإداري (اتاخد من حد تاني)، فبنضيف تحديث دوري خفيف */}
      <PollRefresher everyMs={10000} />

      <section className="mb-8">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold"><IconBadge name="delivery" size="sm" /> طلبات جديدة</h2>
        <p className="mb-4 text-xs text-textSecondary">أول واحد يضغط «استلام» هو اللي بياخد الطلب وبيختفي من عند الباقي.</p>
        {(open ?? []).length === 0 ? (
          <p className="card text-sm text-textSecondary">مفيش طلبات جديدة دلوقتي — هتظهر هنا فورًا أول ما توصل.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {(open ?? []).map((o: any) => (
              <div key={o.id} className="card animate-fadeIn space-y-2">
                <Link href={`${basePath}/${o.id}`} className="block space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="numeric font-medium">{o.order_number}</p>
                    <span className="text-xs text-textSecondary numeric">{o.order_items?.[0]?.count ?? 0} صنف</span>
                  </div>
                  <p className="text-sm">{o.customer_name}</p>
                  <p className="text-sm text-textSecondary">{o.address_text}</p>
                </Link>
                <ClaimOrderButton orderId={o.id} basePath={basePath} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">طلباتي الجارية</h2>
        {(mine ?? []).length === 0 ? (
          <EmptyState illustration={<NoOrdersIllustration />} title="مفيش طلبات معاك حاليًا" description="استلم طلب من القائمة اللي فوق وهيظهر هنا" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {(mine ?? []).map((o: any) => (
              <Link key={o.id} href={`${basePath}/${o.id}`} className="card card-interactive flex animate-fadeIn items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconBadge name={o.status === "shopping" ? "cart" : "delivery"} size="sm" />
                  <div>
                    <p className="numeric font-medium">{o.order_number} — {o.customer_name}</p>
                    <p className="text-xs text-textSecondary">{o.address_text}</p>
                  </div>
                </div>
                <OrderStatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
