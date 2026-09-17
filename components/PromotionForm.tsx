"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PromotionForm() {
  const supabase = createClient();
  const router = useRouter();
  const [customers, setCustomers] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [form, setForm] = useState({
    name: "", count: "5", windowHours: "24", rewardType: "free_delivery", rewardValue: "",
    scope: "general", selectedCustomers: [] as string[]
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("users").select("id,full_name,phone").eq("role", "customer").then(({ data }) => setCustomers(data ?? []));
  }, []);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("اكتب اسم للعرض"); return; }
    if (form.rewardType !== "free_delivery" && !form.rewardValue) { setError("أدخل قيمة الخصم"); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: promo, error } = await supabase.from("promotions").insert({
      name: form.name,
      condition_type: "order_count_window",
      condition_config: { count: Number(form.count), window_hours: Number(form.windowHours) },
      reward_type: form.rewardType,
      reward_value: form.rewardType === "free_delivery" ? null : Number(form.rewardValue),
      created_by: user?.id
    }).select().single();

    if (error) { setLoading(false); setError(error.message); return; }

    if (form.scope === "customers" && form.selectedCustomers.length > 0) {
      await supabase.from("promotion_customers").insert(
        form.selectedCustomers.map((customer_id) => ({ promotion_id: promo.id, customer_id }))
      );
    }

    setLoading(false);
    setForm({ name: "", count: "5", windowHours: "24", rewardType: "free_delivery", rewardValue: "", scope: "general", selectedCustomers: [] });
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">إضافة عرض جديد</h2>
      <input className="input" placeholder="اسم العرض (مثال: عرض الطلب الخامس)" value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })} />

      <div className="flex items-center gap-2 text-sm">
        <span>لو العميل طلب</span>
        <input type="number" className="input w-20" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
        <span>مرات خلال</span>
        <input type="number" className="input w-20" value={form.windowHours} onChange={(e) => setForm({ ...form, windowHours: e.target.value })} />
        <span>ساعة</span>
      </div>

      <div className="flex gap-2">
        <select className="input" value={form.rewardType} onChange={(e) => setForm({ ...form, rewardType: e.target.value })}>
          <option value="free_delivery">توصيل ببلاش</option>
          <option value="delivery_discount_percent">خصم نسبة % على التوصيل</option>
          <option value="delivery_discount_fixed">خصم قيمة ثابتة على التوصيل</option>
        </select>
        {form.rewardType !== "free_delivery" && (
          <input type="number" className="input" placeholder="القيمة" value={form.rewardValue}
            onChange={(e) => setForm({ ...form, rewardValue: e.target.value })} />
        )}
      </div>

      <div className="flex gap-2 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={form.scope === "general"} onChange={() => setForm({ ...form, scope: "general" })} />
          كل العملاء
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={form.scope === "customers"} onChange={() => setForm({ ...form, scope: "customers" })} />
          عملاء محددين
        </label>
      </div>

      {form.scope === "customers" && (
        <select multiple className="input h-32" value={form.selectedCustomers}
          onChange={(e) => setForm({ ...form, selectedCustomers: Array.from(e.target.selectedOptions, (o) => o.value) })}>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
        </select>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary">إضافة العرض</button>
    </div>
  );
}
