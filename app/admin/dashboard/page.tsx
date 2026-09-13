import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import IconBadge from "@/components/IconBadge";
import Icon from "@/components/Icon";

type Tone = "accent" | "brand" | "success" | "warning" | "error" | "info";

function StatCard({ label, value, icon, tone = "accent" }: { label: string; value: string | number; icon: Parameters<typeof Icon>[0]["name"]; tone?: Tone }) {
  return (
    <div className="card flex items-center gap-3 animate-fadeIn">
      <IconBadge name={icon} tone={tone} />
      <div className="min-w-0">
        <p className="truncate text-sm text-textSecondary">{label}</p>
        <p className="numeric mt-0.5 text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const supabase = createServerSupabase();
  const { data: dashboard } = await supabase.rpc("get_business_dashboard").single();
  const { data: financial } = await supabase.rpc("get_financial_summary").single();

  const d: any = dashboard ?? {};
  const f: any = financial ?? {};

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">نظرة عامة</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <StatCard label="طلبات جديدة" value={d.new_orders ?? 0} icon="orders" />
          <StatCard label="قيد التنفيذ" value={d.in_progress_orders ?? 0} icon="cart" />
          <StatCard label="جاهزة للتوصيل" value={d.ready_orders ?? 0} icon="products" />
          <StatCard label="في الطريق" value={d.on_the_way_orders ?? 0} icon="delivery" />
          <StatCard label="مكتملة" value={d.completed_orders ?? 0} icon="check" tone="success" />
          <StatCard label="ملغاة" value={d.canceled_orders ?? 0} icon="close" tone="error" />
          <StatCard label="إجمالي المبيعات" value={`${f.total_sales ?? 0} ج.م`} icon="wallet" tone="brand" />
          <StatCard label="مبالغ مستحقة (ديون)" value={`${f.outstanding_debts ?? 0} ج.م`} icon="debt" tone="warning" />
          <StatCard label="عدد العملاء" value={f.total_customers ?? 0} icon="customer" />
          {f.commission_due != null && <StatCard label="عمولة مستحقة" value={`${f.commission_due} ج.م`} icon="payment" tone="brand" />}
        </div>
      </main>
    </>
  );
}
