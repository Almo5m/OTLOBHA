"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ShoppingForm({ orderId, items }: { orderId: string; items: any[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState<Record<string, { price: string; available: boolean }>>(
    Object.fromEntries(items.map((i) => [i.id, { price: "", available: true }]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  async function saveItem(itemId: string) {
    const s = state[itemId];
    setLoading(true);
    const { error } = await supabase.rpc("record_item_purchase", {
      p_order_item_id: itemId,
      p_actual_price: s.available ? Number(s.price) : null,
      p_is_available: s.available,
      p_unavailable_reason: s.available ? null : "غير متوفر في السوق حاليًا"
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function finishShopping() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("submit_for_invoice", { p_order_id: orderId });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/agent/dashboard");
  }

  async function handleDecline() {
    if (!declineReason.trim()) { setError("يجب كتابة سبب مقنع لرفض الطلب"); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("decline_shopping_assignment", { p_order_id: orderId, p_reason: declineReason });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/agent/dashboard");
  }

  const allResolved = items.every((i) => i.is_available !== null);

  return (
    <div className="space-y-3">
      <h2 className="font-medium">تسجيل الشراء</h2>
      {items.map((item) => (
        <div key={item.id} className="card">
          <p className="mb-2 font-medium">{item.products?.name ?? item.manual_name} — {item.quantity} {item.sale_units?.name}</p>
          {item.customer_comment && <p className="mb-2 text-xs text-textSecondary">ملاحظة العميل: {item.customer_comment}</p>}

          {item.is_available !== null ? (
            <p className="text-sm text-primary">
              {item.is_available ? `تم تسجيل السعر: ${item.actual_price} ج.م` : "تم تحديده كغير متوفر"}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={state[item.id].available}
                  onChange={(e) => setState({ ...state, [item.id]: { ...state[item.id], available: e.target.checked } })} />
                متوفر
              </label>
              {state[item.id].available && (
                <input type="number" dir="ltr" placeholder="السعر الفعلي" className="input"
                  value={state[item.id].price}
                  onChange={(e) => setState({ ...state, [item.id]: { ...state[item.id], price: e.target.value } })} />
              )}
              <button onClick={() => saveItem(item.id)} disabled={loading} className="btn-secondary shrink-0">حفظ</button>
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-sm text-error">{error}</p>}

      <button onClick={finishShopping} disabled={!allResolved || loading} className="btn-primary w-full">
        إنهاء الشراء وتجهيز الفاتورة
      </button>

      <div className="card">
        {!showDecline ? (
          <button onClick={() => setShowDecline(true)} className="text-sm text-error">
            مش قادر أنفّذ الطلب ده
          </button>
        ) : (
          <div className="space-y-2">
            <textarea className="input" placeholder="اكتب سبب مقنع لرفض الطلب" value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)} />
            <button onClick={handleDecline} disabled={loading} className="btn-secondary">
              تأكيد الرفض وإعادة الطلب لنظام التعيين
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
