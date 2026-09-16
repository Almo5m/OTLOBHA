"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["تأخير في التوصيل", "منتج غير مطابق", "سوء تعامل من المندوب", "خطأ في الفاتورة", "أخرى"];

export default function ComplaintForm() {
  const supabase = createClient();
  const router = useRouter();
  const orderId = useSearchParams().get("order");
  const [type, setType] = useState(TYPES[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!details.trim()) { setError("يرجى كتابة تفاصيل الشكوى"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let agentId = null;
    if (orderId) {
      const { data: order } = await supabase.from("orders").select("assigned_agent_id").eq("id", orderId).single();
      agentId = order?.assigned_agent_id ?? null;
    }

    const { error } = await supabase.from("complaints").insert({
      customer_id: user?.id, order_id: orderId, agent_id: agentId, type, details
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/orders");
  }

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="complaints" size={20} className="text-textSecondary" /> تقديم شكوى</h1>
      <div className="card space-y-4">
        <div>
          <label className="label">نوع الشكوى</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">التفاصيل</label>
          <textarea className="input" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">إرسال الشكوى</button>
      </div>
    </>
  );
}
