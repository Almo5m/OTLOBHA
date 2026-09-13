"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CANCELLABLE = ["review", "accepted", "shopping", "invoice_preparation", "invoice_approved", "ready_for_delivery", "assigned", "on_the_way"];

export default function OrderActions({ orderId, status, hasRating }: { orderId: string; status: string; hasRating: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState({ stars: 5, punctuality: 5, behavior: 5, accuracy: 5, honesty: 5 });

  async function handleCancel() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("cancel_order_by_customer", { p_order_id: orderId, p_reason: reason || null });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function handleRate() {
    setLoading(true);
    const { data: order } = await supabase.from("orders").select("assigned_agent_id,customer_id").eq("id", orderId).single();
    const { error } = await supabase.from("ratings").insert({
      order_id: orderId,
      customer_id: order?.customer_id,
      agent_id: order?.assigned_agent_id,
      stars: rating.stars,
      punctuality_score: rating.punctuality,
      behavior_score: rating.behavior,
      order_accuracy_score: rating.accuracy,
      honesty_score: rating.honesty
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-4">
      {CANCELLABLE.includes(status) && (
        <div className="card">
          {!showCancel ? (
            <button onClick={() => setShowCancel(true)} className="text-sm text-error">إلغاء الطلب</button>
          ) : (
            <div className="space-y-2">
              <textarea className="input" placeholder="سبب الإلغاء (اختياري)" value={reason}
                onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={handleCancel} disabled={loading} className="btn-primary bg-error hover:opacity-90">
                  تأكيد الإلغاء
                </button>
                <button onClick={() => setShowCancel(false)} className="btn-secondary">تراجع</button>
              </div>
              <p className="text-xs text-textSecondary">
                إذا كان الطلب قد تم قبوله بالفعل، قد يتم تطبيق مديونية إلغاء حسب سياسة الخدمة الحالية.
              </p>
            </div>
          )}
        </div>
      )}

      {status === "delivered" && !hasRating && (
        <div className="card">
          <h3 className="mb-3 font-medium">قيّم المندوب</h3>
          {(["stars", "punctuality", "behavior", "accuracy", "honesty"] as const).map((k) => (
            <div key={k} className="mb-2 flex items-center justify-between text-sm">
              <span>{{ stars: "التقييم العام", punctuality: "الالتزام بالموعد", behavior: "التعامل", accuracy: "الالتزام بالطلب", honesty: "الأمانة" }[k]}</span>
              <select className="rounded-sm border border-line px-2 py-1" value={rating[k]}
                onChange={(e) => setRating({ ...rating, [k]: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          ))}
          <button onClick={handleRate} disabled={loading} className="btn-primary mt-2 w-full">إرسال التقييم</button>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
