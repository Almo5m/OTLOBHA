"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CancelOrderButton({ token }: { token: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true); setError(null);
    const { error: err } = await supabase.rpc("cancel_order_by_customer", { p_token: token, p_reason: reason || null });
    setBusy(false);
    if (err) { setError(err.message); router.refresh(); return; }
    router.refresh();
  }

  if (!open) return <button onClick={() => setOpen(true)} className="text-sm text-error underline underline-offset-2">إلغاء الطلب</button>;
  return (
    <div className="card space-y-2">
      <p className="text-sm">هتلغي الطلب؟ (متاح طول ما حد لسه ما استلمه)</p>
      <input className="input" placeholder="السبب (اختياري)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={cancel} disabled={busy} className="btn-danger px-3 py-1.5 text-sm">تأكيد الإلغاء</button>
        <button onClick={() => setOpen(false)} className="btn-ghost px-3 py-1.5 text-sm">تراجع</button>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

const CRITERIA = [
  { key: "p_punctuality", label: "الالتزام بالمواعيد" },
  { key: "p_behavior", label: "حسن التعامل" },
  { key: "p_accuracy", label: "دقة الطلب" },
  { key: "p_honesty", label: "الأمانة" }
] as const;

function Stars({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}`}
            onClick={() => onChange(n)} className={`text-2xl leading-none ${n <= value ? "text-warning" : "text-borderc"}`}>★</button>
        ))}
      </div>
    </div>
  );
}

export function RatingForm({ token }: { token: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [detail, setDetail] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (stars === 0) { setError("اختار تقييمك العام الأول"); return; }
    setBusy(true); setError(null);
    const { error: err } = await supabase.rpc("submit_rating", {
      p_token: token, p_stars: stars,
      p_punctuality: detail.p_punctuality ?? null, p_behavior: detail.p_behavior ?? null,
      p_accuracy: detail.p_accuracy ?? null, p_honesty: detail.p_honesty ?? null
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">قيّم تجربتك</h2>
      <Stars value={stars} onChange={setStars} label="التقييم العام" />
      <details className="text-sm">
        <summary className="cursor-pointer text-textSecondary">تفاصيل أكتر (اختياري)</summary>
        <div className="mt-2 space-y-2">
          {CRITERIA.map((c) => (
            <Stars key={c.key} label={c.label} value={detail[c.key] ?? 0} onChange={(n) => setDetail({ ...detail, [c.key]: n })} />
          ))}
        </div>
      </details>
      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary w-full">إرسال التقييم</button>
    </div>
  );
}

export function CopyLinkButton() {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-secondary w-full text-sm"
      onClick={async () => {
        try { await navigator.clipboard.writeText(window.location.href.split("?")[0]); setDone(true); setTimeout(() => setDone(false), 2000); } catch {}
      }}>
      {done ? "اتنسخ ✔" : "انسخ رابط المتابعة"}
    </button>
  );
}
