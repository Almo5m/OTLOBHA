import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import NoOrdersIllustration from "@/components/illustrations/NoOrdersIllustration";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function OrdersPage() {
  const supabase = await createServerSupabase();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_number,status,created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <CustomerNav />
      <RealtimeRefresher tables={["orders"]} channelName="customer-orders-list" />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6 lg:max-w-4xl">
        <h1 className="mb-4 text-xl font-bold">طلباتي</h1>
        {(orders ?? []).length === 0 ? (
          <EmptyState
            illustration={<NoOrdersIllustration />}
            title="لسه معملتش أي طلب"
            description="تصفّح التصنيفات وابدأ أول طلب ليك"
            action={<Link href="/home" className="btn-primary">تصفّح المنتجات</Link>}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {(orders ?? []).map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="card card-interactive flex items-center justify-between animate-fadeIn">
                <div>
                  <p className="numeric font-medium">{o.order_number}</p>
                  <p className="text-xs text-textSecondary">{new Date(o.created_at).toLocaleString("ar-EG")}</p>
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
