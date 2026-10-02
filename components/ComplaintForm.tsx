"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import { toWesternDigits } from "@/lib/format/digits";

const TYPES = ["تأخير في التوصيل", "منتج غير مطابق", "سوء تعامل من المندوب", "خطأ في الفاتورة", "أخرى"];

export default function ComplaintForm() {
  const supabase = createClient();
  const token = useSearchParams().get("t");
  const [type, setType] = useState(TYPES[0]);
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [linked, setLinked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // لو جاي من صفحة طلب: الاسم والرقم بيتاخدوا من الطلب نفسه
  useEffect(() => {
    if (!token) return;
    supabase.rpc("get_order_by_token", { p_token: token }).then(({ data }) => {
      if (data) setLinked((data as any).order_number);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSubmit() {
    setError(null);
    if (details.trim().length < 5) { setError("اكتب تفاصيل الشكوى"); return; }
    if (!linked) {
      if (name.trim().length < 2) { setError("اكتب اسمك"); return; }
      if (!/^01[0125][0-9]{8}$/.test(toWesternDigits(phone))) { setError("رقم الموبايل غير صحيح"); return; }
    }
    setLoading(true);
    const { error: err } = await supabase.rpc("submit_complaint", {
      p_token: linked ? token : null, p_name: name, p_phone: toWesternDigits(phone), p_type: type, p_details: details
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card space-y-3 text-center">
        <p className="font-medium text-success">وصلتنا شكواك وهنتواصل معاك في أقرب وقت.</p>
        <Link href={token ? `/order/${token}` : "/home"} className="btn-secondary">رجوع</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="complaints" size={20} className="text-textSecondary" /> تقديم شكوى</h1>
      <div className="card space-y-4">
        {linked && <p className="text-sm text-textSecondary">الشكوى هتتربط بالطلب <span className="numeric font-medium">{linked}</span></p>}
        {!linked && (
          <>
            <div>
              <label className="label" htmlFor="c-name">الاسم</label>
              <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="c-phone">رقم الموبايل</label>
              <input id="c-phone" className="input" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(toWesternDigits(e.target.value))} />
            </div>
          </>
        )}
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
