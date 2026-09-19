import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import DiscountForm from "@/components/DiscountForm";
import DiscountToggle from "@/components/DiscountToggle";
import Icon from "@/components/Icon";
import { Badge } from "@/components/Badge";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AdminDiscountsPage() {
  const supabase = createServerSupabase();
  const { data: discounts } = await supabase
    .from("customer_discounts")
    .select("*, users(full_name, phone)")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["customer_discounts"]} channelName="admin-discounts-list" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="wallet" size={20} className="text-textSecondary" /> خصومات التوصيل
        </h1>

        <DiscountForm />

        <div className="mt-6 space-y-2">
          {(discounts ?? []).map((d: any) => (
            <div key={d.id} className="card flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">
                  {d.customer_id ? `${d.users?.full_name} — ${d.users?.phone}` : "خصم عام (كل العملاء)"}
                </p>
                <p className="numeric text-textSecondary">
                  {d.discount_type === "percentage" ? `${d.value}%` : `${d.value} ج.م`} على رسوم التوصيل
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={d.is_active ? "success" : "neutral"}>{d.is_active ? "فعّال" : "متوقف"}</Badge>
                <DiscountToggle id={d.id} isActive={d.is_active} />
              </div>
            </div>
          ))}
          {(discounts ?? []).length === 0 && <p className="text-sm text-textSecondary">لا توجد خصومات مضافة بعد.</p>}
        </div>
      </main>
    </>
  );
}
