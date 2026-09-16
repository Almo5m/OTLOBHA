"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import ImageUploadField from "@/components/ImageUploadField";

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
        <Icon name="settings" size={20} className="text-textSecondary" /> الإعدادات العامة
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

      {/* بيانات حسابات الدفع الإلكتروني — Jsonb بحقول فرعية، منفصلة عن القائمة العامة */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 font-bold">
        <Icon name="wallet" size={17} className="text-textSecondary" /> بيانات الدفع الإلكتروني
      </h2>
      <div className="space-y-4">
        <div className="card">
          <p className="label mb-2">المحفظة الإلكترونية</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="رقم المحفظة" value={values.payment_wallet_details?.number ?? ""}
              onChange={(e) => setValues({ ...values, payment_wallet_details: { ...values.payment_wallet_details, number: e.target.value } })} />
            <input className="input" placeholder="الاسم المسجّل" value={values.payment_wallet_details?.name ?? ""}
              onChange={(e) => setValues({ ...values, payment_wallet_details: { ...values.payment_wallet_details, name: e.target.value } })} />
          </div>
          <button onClick={() => handleSave("payment_wallet_details")} className="btn-secondary mt-2">حفظ</button>
        </div>
        <div className="card">
          <p className="label mb-2">InstaPay</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="حساب InstaPay (رقم/رابط)" value={values.payment_instapay_details?.handle ?? ""}
              onChange={(e) => setValues({ ...values, payment_instapay_details: { ...values.payment_instapay_details, handle: e.target.value } })} />
            <input className="input" placeholder="الاسم المسجّل" value={values.payment_instapay_details?.name ?? ""}
              onChange={(e) => setValues({ ...values, payment_instapay_details: { ...values.payment_instapay_details, name: e.target.value } })} />
          </div>
          <button onClick={() => handleSave("payment_instapay_details")} className="btn-secondary mt-2">حفظ</button>
        </div>
      </div>

      {/* بانر الصفحة الرئيسية */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 font-bold">
        <Icon name="products" size={17} className="text-textSecondary" /> بانر الصفحة الرئيسية
      </h2>
      <div className="card space-y-3">
        {values.home_banner_image_url && (
          <img src={values.home_banner_image_url} alt="" className="h-32 w-full rounded-md object-cover" />
        )}
        <ImageUploadField onUploaded={(url) => setValues({ ...values, home_banner_image_url: url })} />
        <div className="flex gap-2">
          <button onClick={() => handleSave("home_banner_image_url")} className="btn-secondary">حفظ البانر</button>
          {values.home_banner_image_url && (
            <button onClick={() => { setValues({ ...values, home_banner_image_url: "" }); handleSave("home_banner_image_url"); }} className="text-sm text-error">
              إزالة البانر
            </button>
          )}
        </div>
      </div>

      {/* شريط الإعلانات أسفل الـNavbar */}
      <h2 className="mb-3 mt-8 flex items-center gap-2 font-bold">
        <Icon name="notifications" size={17} className="text-textSecondary" /> شريط الإعلانات
      </h2>
      <div className="card space-y-3">
        <label className="label">تفعيل الشريط؟</label>
        <select className="input" value={String(values.announcement_bar_enabled ?? false)}
          onChange={(e) => setValues({ ...values, announcement_bar_enabled: e.target.value === "true" })}>
          <option value="true">نعم</option>
          <option value="false">لا</option>
        </select>
        <label className="label">نص الرسالة</label>
        <textarea className="input" value={values.announcement_bar_text ?? ""}
          onChange={(e) => setValues({ ...values, announcement_bar_text: e.target.value })} />
        <button onClick={() => { handleSave("announcement_bar_enabled"); handleSave("announcement_bar_text"); }} className="btn-secondary">حفظ</button>
      </div>

      {saved && <p className={`mt-3 text-sm ${saved.startsWith("فشل") ? "text-error" : "text-success"}`}>{saved}</p>}
    </>
  );
}
