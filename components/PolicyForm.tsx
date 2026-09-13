"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PolicyForm() {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({ type: "terms", version: "1.0", content: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.content.trim()) { setError("يرجى كتابة نص السياسة"); return; }
    setLoading(true);
    const { error } = await supabase.from("policies").insert(form);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setForm({ ...form, content: "" });
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">إضافة/تحديث نسخة سياسة</h2>
      <div className="flex gap-2">
        <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="terms">الشروط والأحكام</option>
          <option value="privacy">سياسة الخصوصية</option>
        </select>
        <input className="input" placeholder="رقم الإصدار (مثال 1.0)" value={form.version}
          onChange={(e) => setForm({ ...form, version: e.target.value })} />
      </div>
      <textarea className="input" rows={6} placeholder="نص السياسة الكامل" value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })} />
      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary">حفظ كنسخة جديدة</button>
      <p className="text-xs text-textSecondary">
        ملحوظة: كل حفظ يُنشئ نسخة جديدة (لا يُعدَّل النص القديم) — الطلبات الجديدة تستخدم آخر نسخة منشورة تلقائيًا.
      </p>
    </div>
  );
}
