"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RecordCommissionPaymentForm() {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({ amount: "", from: "", to: "", notes: "تم الاستلام عن طريق تحويل" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.amount || !form.from || !form.to) { setError("يرجى إكمال البيانات"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("record_commission_payment", {
      p_amount: Number(form.amount), p_period_from: form.from, p_period_to: form.to, p_notes: form.notes
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setForm({ amount: "", from: "", to: "", notes: "تم الاستلام عن طريق تحويل" });
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">تسجيل دفعة عمولة</h2>
      <input type="number" dir="ltr" className="input" placeholder="المبلغ" value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      <div className="flex gap-2">
        <input type="date" className="input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
        <input type="date" className="input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
      </div>
      <input className="input" placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary">تسجيل الدفعة</button>
    </div>
  );
}
