import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import PipelineStrip from "@/components/PipelineStrip";
import RecentOrdersList from "@/components/RecentOrdersList";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import Icon from "@/components/Icon";
import Link from "next/link";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AdminDashboard() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("role,full_name").eq("id", user?.id).single();
  const isSuperAdmin = profile?.role === "super_admin";
  const isBusinessAdmin = profile?.role === "business_admin";

  // Business Admin يقدر يستقبل طلبات زي أي مندوب — لازم يفعّل حالة التوفر
  const { data: agentProfile } = isBusinessAdmin
    ? await supabase.from("agent_profiles").select("availability_status").eq("user_id", user?.id).single()
    : { data: null };

  const { data: dashboard } = await supabase.rpc("get_business_dashboard").single();
  const { data: financial } = await supabase.rpc("get_financial_summary").single();
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id,order_number,status,created_at,users!orders_customer_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const d: any = dashboard ?? {};
  const f: any = financial ?? {};

  let agentPerf: any[] = [];
  let topProducts: any[] = [];
  if (isSuperAdmin) {
    const [{ data: perf }, { data: top }] = await Promise.all([
      supabase.rpc("get_agent_performance"),
      supabase.rpc("get_top_products")
    ]);
    agentPerf = (perf ?? []).slice().sort((a: any, b: any) => (b.completed_orders ?? 0) - (a.completed_orders ?? 0)).slice(0, 3);
    topProducts = (top ?? []).slice(0, 3);
  }

  const today = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["orders"]} channelName="admin-dashboard" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">أهلًا، {profile?.full_name?.split(" ")[0] ?? ""} 👋</h1>
            <p className="text-sm text-textSecondary">{today}</p>
          </div>
          {isBusinessAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-textSecondary">استقبال الطلبات كمندوب:</span>
              <AvailabilityToggle status={agentProfile?.availability_status ?? "offline"} />
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* الحاجة الأهم اللي محتاجة انتباه فورًا */}
            {d.new_orders > 0 ? (
              <Link href="/admin/orders" className="card card-interactive flex items-center justify-between gap-4 border-2 border-ink">
                <div>
                  <p className="numeric text-3xl font-bold">{d.new_orders}</p>
                  <p className="mt-1 text-sm text-textSecondary">
                    {d.new_orders === 1 ? "طلب جديد بانتظار المراجعة" : "طلبات جديدة بانتظار المراجعة"}
                  </p>
                </div>
                <span className="btn-secondary shrink-0">مراجعة الآن</span>
              </Link>
            ) : (
              <div className="card flex items-center gap-3 text-textSecondary">
                <Icon name="check" size={18} />
                <span className="text-sm">مفيش طلبات جديدة محتاجة مراجعة دلوقتي.</span>
              </div>
            )}

            {/* دورة الطلبات الحالية بشكل مرئي بدل كروت منفصلة */}
            <PipelineStrip
              values={{
                new: d.new_orders ?? 0,
                in_progress: d.in_progress_orders ?? 0,
                ready: d.ready_orders ?? 0,
                on_the_way: d.on_the_way_orders ?? 0,
                completed: d.completed_orders ?? 0
              }}
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-bold">أحدث الطلبات</h2>
                <Link href="/admin/orders" className="text-sm text-accent underline">عرض الكل</Link>
              </div>
              <RecentOrdersList orders={(recentOrders as any) ?? []} />
            </div>
          </div>

          {/* العمود الجانبي: الملخص المالي — رقم كبير + إحصاءات ثانوية بنفس الكارت */}
          <div className="space-y-6">
            <div className="card">
              <p className="text-sm text-textSecondary">إجمالي المبيعات</p>
              <p className="numeric mt-1 text-3xl font-bold">{f.total_sales ?? 0} <span className="text-base font-normal text-textSecondary">ج.م</span></p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-borderc pt-4 text-sm">
                <div>
                  <p className="text-textSecondary">ديون مستحقة</p>
                  <p className="numeric font-semibold text-warning">{f.outstanding_debts ?? 0} ج.م</p>
                </div>
                <div>
                  <p className="text-textSecondary">عدد العملاء</p>
                  <p className="numeric font-semibold">{f.total_customers ?? 0}</p>
                </div>
                <div>
                  <p className="text-textSecondary">طلبات ملغاة</p>
                  <p className="numeric font-semibold text-error">{d.canceled_orders ?? 0}</p>
                </div>
                {isSuperAdmin && (
                  <div>
                    <p className="text-textSecondary">عمولة مستحقة</p>
                    <p className="numeric font-semibold">{f.commission_due ?? 0} ج.م</p>
                  </div>
                )}
              </div>
            </div>

            {isSuperAdmin && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                <div className="card">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Icon name="agent" size={15} className="text-textSecondary" /> أفضل المندوبين
                  </h3>
                  <div className="space-y-2.5">
                    {agentPerf.map((a) => (
                      <div key={a.agent_id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{a.full_name}</span>
                        <span className="numeric shrink-0 text-textSecondary">{a.completed_orders} طلب</span>
                      </div>
                    ))}
                    {agentPerf.length === 0 && <p className="text-sm text-textSecondary">لا توجد بيانات كافية بعد.</p>}
                  </div>
                </div>

                <div className="card">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                    <Icon name="products" size={15} className="text-textSecondary" /> الأكثر طلبًا
                  </h3>
                  <div className="space-y-2.5">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate">{p.product_name}</span>
                        <span className="numeric shrink-0 text-textSecondary">{p.times_ordered}×</span>
                      </div>
                    ))}
                    {topProducts.length === 0 && <p className="text-sm text-textSecondary">لا توجد بيانات كافية بعد.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
