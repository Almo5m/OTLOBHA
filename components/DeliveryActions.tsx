"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeliveryActions({ orderId, status }: { orderId: string; status: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferReason, setTransferReason] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  async function startDelivery() {
    setLoading(true);
    const { error } = await supabase.rpc("start_delivery", { p_order_id: orderId });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function markDelivered() {
    if (!paymentConfirmed) { setError("لا يمكن تأكيد التسليم قبل تأكيد استلام المبلغ"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("mark_delivered", { p_order_id: orderId, p_payment_received: true });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/agent/dashboard");
  }

  async function handleTransfer() {
    if (!transferReason.trim()) { setError("يجب إدخال سبب عدم القدرة على إكمال الطلب"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("transfer_order", { p_order_id: orderId, p_reason: transferReason });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/agent/dashboard");
  }

  return (
    <div className="space-y-4">
      {status === "assigned" && (
        <button onClick={startDelivery} disabled={loading} className="btn-primary w-full">
          بدء التوصيل
        </button>
      )}

      {status === "on_the_way" && (
        <div className="card space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} />
            أؤكد استلام المبلغ كاملًا من العميل
          </label>
          <button onClick={markDelivered} disabled={loading || !paymentConfirmed} className="btn-primary w-full">
            تم التسليم
          </button>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="card">
        {!showTransfer ? (
          <button onClick={() => setShowTransfer(true)} className="text-sm text-error">
            لا أستطيع إكمال هذا الطلب
          </button>
        ) : (
          <div className="space-y-2">
            <textarea className="input" placeholder="سبب عدم القدرة على الإكمال" value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)} />
            <button onClick={handleTransfer} disabled={loading} className="btn-secondary">تأكيد وإعادة الطلب لنظام التعيين</button>
          </div>
        )}
      </div>
    </div>
  );
}
