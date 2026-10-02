"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fillTemplate, trackingUrl, waLink } from "@/lib/whatsapp";
import { sanitizeNumericInput } from "@/lib/format/digits";
import Icon from "./Icon";

type Item = {
  id: string; quantity: number | null; target_price: number | null;
  actual_price: number | null; is_available: boolean | null; customer_comment: string | null;
  manual_name: string | null; products?: { name: string } | null; sale_units?: { name: string } | null;
};

type Props = {
  order: {
    id: string; status: string; order_number: string; tracking_token: string;
    customer_name: string; customer_phone: string; tracking_message_sent_at: string | null;
    assigned_to_me: boolean; assigned_agent_name: string | null;
  };
  items: Item[];
  isAdmin: boolean;
  claimedTemplate: string | null;
  currentUserName: string;
  onDeliveredHref?: string;
};

export default function StaffOrderActions({ order, items, isAdmin, claimedTemplate, currentUserName }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, { price: string; available: boolean }>>(
    Object.fromEntries(items.map((i) => [i.id, { price: i.actual_price != null ? String(i.actual_price) : "", available: i.is_available ?? true }]))
  );
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true); setError(null);
    const { error: err } = await fn();
    setBusy(false);
    if (err) { setError(err.message); return false; }
    router.refresh();
    return true;
  }

  const canAct = order.assigned_to_me || isAdmin;
  const msgSent = !!order.tracking_message_sent_at;

  // ---------- مرحلة 0: طلب جديد (مش مستلم) ----------
  if (order.status === "new_order") {
    return (
      <div className="space-y-3">
        <button disabled={busy} onClick={() => run(() => supabase.rpc("claim_order", { p_order_id: order.id }))} className="btn-primary w-full">
          {busy ? "جارٍ الاستلام..." : "استلام الطلب"}
        </button>
        <p className="text-xs text-textSecondary">أول واحد يستلم الطلب هو اللي يكمله، وبيختفي من عند الباقي.</p>
        {isAdmin && <CancelBox busy={busy} reason={cancelReason} setReason={setCancelReason} show={showCancel} setShow={setShowCancel}
          onConfirm={() => run(() => supabase.rpc("cancel_order_by_business", { p_order_id: order.id, p_reason: cancelReason }))} />}
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }

  // ---------- جاري الشراء ----------
  if (order.status === "shopping") {
    if (!canAct) {
      return <p className="alert alert-info text-sm">الطلب ده مع {order.assigned_agent_name ?? "إداري تاني"}.</p>;
    }

    function sendTrackingMessage() {
      const body = claimedTemplate ?? "أهلاً {{customer_name}}، طلبك رقم {{order_number}} اتسلّمه {{agent_name}}.\nتابعه من هنا: {{tracking_link}}";
      const text = fillTemplate(body, {
        customer_name: order.customer_name, order_number: order.order_number,
        agent_name: currentUserName, tracking_link: trackingUrl(window.location.origin, order.tracking_token)
      });
      // نفتح واتساب الأول (من الضغطة مباشرة) وبعدين نسجّل
      window.open(waLink(order.customer_phone, text), "_blank");
      run(() => supabase.rpc("mark_tracking_message_sent", { p_order_id: order.id }));
    }

    const allResolved = items.every((i) => i.is_available !== null);

    return (
      <div className="space-y-4">
        {/* الخطوة 1: رسالة المتابعة */}
        <div className="card space-y-2">
          <p className="flex items-center gap-2 font-medium">
            <StepDot done={msgSent} n={1} /> ابعت رسالة المتابعة للعميل
          </p>
          <button onClick={sendTrackingMessage} disabled={busy} className={msgSent ? "btn-secondary w-full text-sm" : "btn-primary w-full"}>
            {msgSent ? "اتبعتت ✔ — إعادة الإرسال" : "فتح واتساب وإرسال رابط المتابعة"}
          </button>
          {!msgSent && <p className="text-xs text-textSecondary">لازم تبعتها قبل ما تسجّل الأسعار.</p>}
        </div>

        {/* الخطوة 2: الشراء */}
        <div className={`space-y-3 ${msgSent ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!msgSent}>
          <p className="flex items-center gap-2 font-medium"><StepDot done={allResolved} n={2} /> سجّل الأسعار الفعلية</p>
          {items.map((item) => {
            const s = prices[item.id];
            const saved = item.is_available !== null;
            return (
              <div key={item.id} className="card">
                <p className="mb-1 font-medium">
                  {item.products?.name ?? item.manual_name} —{" "}
                  <span className="numeric">{item.target_price ? `بميزانية ${item.target_price} ج.م` : `${item.quantity} ${item.sale_units?.name ?? ""}`}</span>
                </p>
                {item.customer_comment && <p className="mb-2 text-xs text-textSecondary">ملاحظة العميل: {item.customer_comment}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={s.available}
                      onChange={(e) => setPrices({ ...prices, [item.id]: { ...s, available: e.target.checked } })} />
                    متوفر
                  </label>
                  {s.available && (
                    <input type="text" inputMode="decimal" dir="ltr" className="input !w-32"
                      placeholder={item.target_price ? "المدفوع فعليًا" : "سعر الوحدة"}
                      value={s.price}
                      onChange={(e) => setPrices({ ...prices, [item.id]: { ...s, price: sanitizeNumericInput(e.target.value) } })} />
                  )}
                  <button disabled={busy || (s.available && s.price === "")} className="btn-secondary shrink-0 px-3 py-1.5 text-sm"
                    onClick={() => run(() => supabase.rpc("record_item_purchase", {
                      p_order_item_id: item.id,
                      p_actual_price: s.available ? Number(s.price) : null,
                      p_is_available: s.available,
                      p_unavailable_reason: s.available ? null : "غير متوفر حاليًا"
                    }))}>
                    {saved ? "تعديل" : "حفظ"}
                  </button>
                  {saved && <Icon name="check" size={16} className="text-success" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* الخطوة 3: خرجت للتوصيل */}
        <button disabled={busy || !allResolved || !msgSent} className="btn-primary w-full"
          onClick={() => run(() => supabase.rpc("start_delivery", { p_order_id: order.id }))}>
          <StepDot done={false} n={3} light /> خلّصت الشراء — في الطريق للعميل
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReleaseBox busy={busy} onConfirm={() => run(() => supabase.rpc("release_order", { p_order_id: order.id, p_reason: null }))} />
          {isAdmin && <CancelBox busy={busy} reason={cancelReason} setReason={setCancelReason} show={showCancel} setShow={setShowCancel}
            onConfirm={() => run(() => supabase.rpc("cancel_order_by_business", { p_order_id: order.id, p_reason: cancelReason }))} />}
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }

  // ---------- في الطريق ----------
  if (order.status === "on_the_way") {
    if (!canAct) return <p className="alert alert-info text-sm">الطلب في الطريق مع {order.assigned_agent_name ?? "إداري تاني"}.</p>;
    return (
      <div className="space-y-3">
        <button disabled={busy} className="btn-primary w-full"
          onClick={() => run(() => supabase.rpc("mark_delivered", { p_order_id: order.id }))}>
          {busy ? "جارٍ التأكيد..." : "تم تسليم الطلب"}
        </button>
        <p className="text-xs text-textSecondary">بعد التأكيد هتطلع الفاتورة تلقائي وتقدر تبعتها للعميل.</p>
        {isAdmin && <CancelBox busy={busy} reason={cancelReason} setReason={setCancelReason} show={showCancel} setShow={setShowCancel}
          onConfirm={() => run(() => supabase.rpc("cancel_order_by_business", { p_order_id: order.id, p_reason: cancelReason }))} />}
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }

  return null;
}

function StepDot({ n, done, light }: { n: number; done: boolean; light?: boolean }) {
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
      done ? "bg-success text-white" : light ? "bg-white/25 text-inherit" : "bg-brand text-inkContrast"}`}>
      {done ? <Icon name="check" size={13} /> : <span className="numeric">{n}</span>}
    </span>
  );
}

function ReleaseBox({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const [sure, setSure] = useState(false);
  if (!sure) return <button onClick={() => setSure(true)} className="text-sm text-textSecondary underline underline-offset-2">رجّع الطلب للكل (اتاخد بالغلط)</button>;
  return (
    <span className="flex items-center gap-2 text-sm">
      هيرجع متاح للكل وهتتمسح الأسعار اللي سجلتها.
      <button disabled={busy} onClick={onConfirm} className="btn-secondary px-3 py-1 text-xs">تأكيد الإرجاع</button>
      <button onClick={() => setSure(false)} className="text-xs text-textSecondary">تراجع</button>
    </span>
  );
}

function CancelBox({ busy, reason, setReason, show, setShow, onConfirm }: {
  busy: boolean; reason: string; setReason: (v: string) => void; show: boolean; setShow: (v: boolean) => void; onConfirm: () => void;
}) {
  if (!show) return <button onClick={() => setShow(true)} className="text-sm text-error underline underline-offset-2">إلغاء الطلب</button>;
  return (
    <div className="card w-full space-y-2">
      <textarea className="input" rows={2} placeholder="سبب الإلغاء" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <button disabled={busy || !reason.trim()} onClick={onConfirm} className="btn-danger px-3 py-1.5 text-sm">تأكيد الإلغاء</button>
        <button onClick={() => setShow(false)} className="btn-ghost px-3 py-1.5 text-sm">تراجع</button>
      </div>
    </div>
  );
}
