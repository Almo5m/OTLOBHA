"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminOrderActions({
  orderId, status, draftInvoiceId
}: { orderId: string; status: string; draftInvoiceId: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [isUncontactable, setIsUncontactable] = useState(false);

  async function run(fn: () => PromiseLike<{ error: any }>) {
    setLoading(true);
    setError(null);
    const { error } = await fn();
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  const cancellable = !["delivered", "canceled_by_customer", "canceled_by_business", "rejected"].includes(status);

  return (
    <div className="space-y-3">
      {status === "review" && (
        <div className="flex flex-wrap gap-2">
          <button disabled={loading} onClick={() => run(() => supabase.rpc("accept_order", { p_order_id: orderId }))}
            className="btn-primary">قبول الطلب</button>
          <button disabled={loading} onClick={() => setShowReject(!showReject)} className="btn-secondary text-error">
            رفض الطلب
          </button>
        </div>
      )}

      {showReject && (
        <div className="card space-y-2">
          <textarea className="input" placeholder="سبب الرفض" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button disabled={loading} onClick={() => run(() => supabase.rpc("reject_order", { p_order_id: orderId, p_reason: reason }))}
            className="btn-primary bg-error hover:opacity-90">تأكيد الرفض</button>
        </div>
      )}

      {status === "invoice_preparation" && draftInvoiceId && (
        <button disabled={loading} onClick={() => run(() => supabase.rpc("approve_invoice", { p_invoice_id: draftInvoiceId }))}
          className="btn-primary">اعتماد الفاتورة</button>
      )}

      {status === "invoice_approved" && draftInvoiceId && (
        <button disabled={loading} onClick={() => {
          const r = prompt("سبب إلغاء الفاتورة لتصحيحها؟");
          if (r) run(() => supabase.rpc("cancel_invoice", { p_invoice_id: draftInvoiceId, p_reason: r }));
        }} className="btn-secondary text-accent">إلغاء الفاتورة وتصحيحها</button>
      )}

      {cancellable && (
        <div className="card">
          {!showCancel ? (
            <button onClick={() => setShowCancel(true)} className="text-sm text-error">إلغاء الطلب من الإدارة</button>
          ) : (
            <div className="space-y-2">
              <textarea className="input" placeholder="سبب الإلغاء (إلزامي)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isUncontactable} onChange={(e) => setIsUncontactable(e.target.checked)} />
                السبب: عدم القدرة على التواصل مع العميل (قد يُطبَّق دين حسب سياسة الخدمة)
              </label>
              <button disabled={loading} onClick={() => run(() => supabase.rpc("cancel_order_by_business", {
                p_order_id: orderId, p_reason: reason, p_is_uncontactable: isUncontactable
              }))} className="btn-primary bg-error hover:opacity-90">تأكيد الإلغاء</button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
