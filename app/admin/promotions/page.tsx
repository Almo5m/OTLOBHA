import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import PromotionForm from "@/components/PromotionForm";
import DiscountToggle from "@/components/DiscountToggle";
import Icon from "@/components/Icon";
import { Badge } from "@/components/Badge";

const REWARD_LABELS: Record<string, string> = {
  free_delivery: "توصيل ببلاش",
  delivery_discount_percent: "خصم % على التوصيل",
  delivery_discount_fixed: "خصم ثابت على التوصيل"
};

export default async function AdminPromotionsPage() {
  const supabase = createServerSupabase();
  const { data: promotions } = await supabase
    .from("promotions")
    .select("*, promotion_customers(customer_id)")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="rating" size={20} className="text-textSecondary" /> العروض المشروطة
        </h1>
        <p className="mb-4 text-xs text-textSecondary">
          العرض بيتطبّق تلقائيًا على رسوم التوصيل فقط (مش على قيمة المنتجات) لما العميل يستوفي الشرط.
        </p>

        <PromotionForm />

        <div className="mt-6 space-y-2">
          {(promotions ?? []).map((p: any) => (
            <div key={p.id} className="card flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="numeric text-textSecondary">
                  كل {p.condition_config?.count} طلبات / {p.condition_config?.window_hours} ساعة
                  {" — "}{REWARD_LABELS[p.reward_type]}{p.reward_value ? ` (${p.reward_value})` : ""}
                </p>
                <p className="text-xs text-textSecondary">
                  {p.promotion_customers?.length > 0 ? `${p.promotion_customers.length} عميل محدد` : "كل العملاء"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={p.is_active ? "success" : "neutral"}>{p.is_active ? "فعّال" : "متوقف"}</Badge>
                <DiscountToggle id={p.id} isActive={p.is_active} table="promotions" />
              </div>
            </div>
          ))}
          {(promotions ?? []).length === 0 && <p className="text-sm text-textSecondary">لا توجد عروض مضافة بعد.</p>}
        </div>
      </main>
    </>
  );
}
