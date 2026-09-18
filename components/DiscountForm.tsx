"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DiscountForm() {
  const supabase = createClient();
  const router = useRouter();
  const [customers, setCustomers] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [form, setForm] = useState({ scope: "general", customerId: "", type: "percentage", value: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("users").select("id,full_name,phone").eq("role", "customer").then(({ data }) => setCustomers(data ?? []));
  }, []);

  async function handleSubmit() {
    if (!form.value || Number(form.value) <= 0) { setError("يرجى إدخال قيمة صحيحة"); return; }
    if (form.scope === "customer" && !form.customerId) { setError("يرجى اختيار العميل"); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("customer_discounts").insert({
      customer_id: form.scope === "general" ? null : form.customerId,
      discount_type: form.type,
      value: Number(form.value),
      created_by: user?.id
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setForm({ scope: "general", customerId: "", type: "percentage", value: "" });
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">إضافة خصم توصيل جديد</h2>
      <div className="flex gap-2">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={form.scope === "general"} onChange={() => setForm({ ...form, scope: "general" })} />
          خصم عام (كل العملاء)
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={form.scope === "customer"} onChange={() => setForm({ ...form, scope: "customer" })} />
          عميل واحد
        </label>
      </div>
      {form.scope === "customer" && (
        <select className="input" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
          <option value="">اختر العميل</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
        </select>
      )}
      <div className="flex gap-2">
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="percentage">نسبة مئوية %</option>
          <option value="fixed">قيمة ثابتة ج.م</option>
        </select>
        <input type="number" dir="ltr" className="input" placeholder="القيمة" value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })} />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary">إضافة الخصم</button>
    </div>
  );
}
