"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

const FIELDS: { key: string; label: string; type: "number" | "text" | "boolean" }[] = [
  { key: "delivery_fee", label: "رسوم التوصيل (ج.م)", type: "number" },
  { key: "commission_rate", label: "نسبة العمولة (مثال: 0.10 = 10%)", type: "number" },
  { key: "cancellation_debt_value", label: "قيمة/نسبة مديونية الإلغاء", type: "number" },
  { key: "cancellation_debt_is_percentage", label: "هل القيمة أعلاه نسبة مئوية؟", type: "boolean" },
  { key: "price_disclaimer_text", label: "نص تنبيه تغيّر الأسعار", type: "text" },
  { key: "outside_working_hours_message", label: "رسالة خارج ساعات العمل", type: "text" },
  { key: "maintenance_message", label: "رسالة وضع الصيانة", type: "text" }
];

export default function AdminSettingsForm() {
  const supabase = createClient();
  const [values, setValues] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("platform_settings").select("key,value").then(({ data }) => {
      setValues(Object.fromEntries((data ?? []).map((r) => [r.key, r.value])));
    });
  }, []);

  async function handleSave(key: string) {
    const { error } = await supabase.from("platform_settings").update({ value: values[key] }).eq("key", key);
    setSaved(error ? `فشل: ${error.message} (هذا الإعداد لصلاحية Super Admin فقط)` : "تم الحفظ ✓");
    setTimeout(() => setSaved(null), 2500);
  }

  return (
    <>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Icon name="settings" size={20} className="text-accent" /> الإعدادات العامة
      </h1>
      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="card">
            <label className="label">{f.label}</label>
            <div className="flex gap-2">
              {f.type === "boolean" ? (
                <select className="input" value={String(values[f.key] ?? false)}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value === "true" })}>
                  <option value="true">نعم</option>
                  <option value="false">لا</option>
                </select>
              ) : f.type === "text" ? (
                <textarea className="input" value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              ) : (
                <input type="number" step="0.01" className="input" value={values[f.key] ?? 0}
                  onChange={(e) => setValues({ ...values, [f.key]: Number(e.target.value) })} />
              )}
              <button onClick={() => handleSave(f.key)} className="btn-secondary shrink-0">حفظ</button>
            </div>
          </div>
        ))}
      </div>
      {saved && <p className={`mt-3 text-sm ${saved.startsWith("فشل") ? "text-error" : "text-success"}`}>{saved}</p>}
    </>
  );
}
