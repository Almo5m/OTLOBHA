"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import ImageUploadField from "@/components/ImageUploadField";

export default function AdminSettingsForm() {
  const supabase = createClient();
  const [values, setValues] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("platform_settings").select("key,value").then(({ data }) => {
      setValues(Object.fromEntries((data ?? []).map((r) => [r.key, r.value])));
    });
  }, []);

  function set(key: string, value: any) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  // حفظ مجموعة مفاتيح مع بعض دفعة واحدة — بدل ما كل حقل ليه زرار حفظ منفصل،
  // كل كارت (مجموعة مرتبطة منطقيًا) ليها زرار واحد بس
  async function saveKeys(keys: string[]) {
    const results = await Promise.all(keys.map((k) => supabase.from("platform_settings").update({ value: values[k] }).eq("key", k)));
    const failed = results.find((r) => r.error);
    setSaved(failed ? `فشل: ${failed.error!.message} (ده إعداد لصلاحية Super Admin فقط)` : "تم الحفظ ✓");
    setTimeout(() => setSaved(null), 2500);
  }

  return (
    <>
      <h1 className="mb-5 flex items-center gap-2 text-xl font-bold">
        <Icon name="settings" size={20} className="text-textSecondary" /> الإعدادات العامة
      </h1>

      <div className="space-y-5">
        {/* الرسوم والعمولة */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="wallet" size={17} className="text-textSecondary" /> الرسوم والعمولة
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">رسوم التوصيل (ج.م)</label>
              <input type="number" dir="ltr" step="0.01" className="input" value={values.delivery_fee ?? 0}
                onChange={(e) => set("delivery_fee", Number(e.target.value))} />
            </div>
            <div>
              <label className="label">نسبة العمولة (مثال: 0.10 = 10%)</label>
              <input type="number" dir="ltr" step="0.01" className="input" value={values.commission_rate ?? 0}
                onChange={(e) => set("commission_rate", Number(e.target.value))} />
            </div>
          </div>
          <button onClick={() => saveKeys(["delivery_fee", "commission_rate"])} className="btn-secondary mt-3">حفظ</button>
        </section>

        {/* سياسة إلغاء الطلبات */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="debt" size={17} className="text-textSecondary" /> سياسة إلغاء الطلبات
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">قيمة/نسبة مديونية الإلغاء</label>
              <input type="number" dir="ltr" step="0.01" className="input" value={values.cancellation_debt_value ?? 0}
                onChange={(e) => set("cancellation_debt_value", Number(e.target.value))} />
            </div>
            <div>
              <label className="label">هل القيمة أعلاه نسبة مئوية؟</label>
              <select className="input" value={String(values.cancellation_debt_is_percentage ?? false)}
                onChange={(e) => set("cancellation_debt_is_percentage", e.target.value === "true")}>
                <option value="true">نعم، نسبة مئوية</option>
                <option value="false">لا، قيمة ثابتة</option>
              </select>
            </div>
          </div>
          <button onClick={() => saveKeys(["cancellation_debt_value", "cancellation_debt_is_percentage"])} className="btn-secondary mt-3">حفظ</button>
        </section>

        {/* التواصل والدعم */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="complaints" size={17} className="text-textSecondary" /> التواصل والدعم
          </h2>
          <label className="label">رقم واتساب التواصل/الشكاوى</label>
          <input type="tel" dir="ltr" className="input max-w-xs" placeholder="01012345678" value={values.support_whatsapp_number ?? ""}
            onChange={(e) => set("support_whatsapp_number", e.target.value.replace(/[^\d]/g, ""))} />
          <p className="mt-1.5 text-xs text-textSecondary">ده الرقم اللي هيظهر لأي زرار "تواصل معانا" في الموقع كله.</p>
          <button onClick={() => saveKeys(["support_whatsapp_number"])} className="btn-secondary mt-3">حفظ</button>
        </section>

        {/* بيانات الدفع الإلكتروني */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="payment" size={17} className="text-textSecondary" /> بيانات الدفع الإلكتروني
          </h2>
          <div className="space-y-4">
            <div>
              <p className="label mb-2">المحفظة الإلكترونية</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" placeholder="رقم المحفظة" dir="ltr" value={values.payment_wallet_details?.number ?? ""}
                  onChange={(e) => set("payment_wallet_details", { ...values.payment_wallet_details, number: e.target.value })} />
                <input className="input" placeholder="الاسم المسجّل" value={values.payment_wallet_details?.name ?? ""}
                  onChange={(e) => set("payment_wallet_details", { ...values.payment_wallet_details, name: e.target.value })} />
              </div>
            </div>
            <div>
              <p className="label mb-2">InstaPay</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" placeholder="حساب InstaPay (رقم/رابط)" dir="ltr" value={values.payment_instapay_details?.handle ?? ""}
                  onChange={(e) => set("payment_instapay_details", { ...values.payment_instapay_details, handle: e.target.value })} />
                <input className="input" placeholder="الاسم المسجّل" value={values.payment_instapay_details?.name ?? ""}
                  onChange={(e) => set("payment_instapay_details", { ...values.payment_instapay_details, name: e.target.value })} />
              </div>
            </div>
          </div>
          <button onClick={() => saveKeys(["payment_wallet_details", "payment_instapay_details"])} className="btn-secondary mt-3">حفظ</button>
        </section>

        {/* شعار التطبيق */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="market" size={17} className="text-textSecondary" /> شعار التطبيق
          </h2>
          <p className="mb-3 text-xs text-textSecondary">
            الشعار ده بيظهر جمب اسم "المنيب جو" في أعلى كل الصفحات — للعميل والمندوب والإدارة. الأفضل صورة مربعة بخلفية شفافة أو فاتحة.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {values.app_logo_url && (
              <img src={values.app_logo_url} alt="" className="h-16 w-16 rounded-xl border border-borderc object-cover" />
            )}
            <ImageUploadField purpose="catalog" onUploaded={(url) => set("app_logo_url", url)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button onClick={() => saveKeys(["app_logo_url"])} className="btn-secondary">حفظ الشعار</button>
            {values.app_logo_url && (
              <button onClick={() => { set("app_logo_url", ""); saveKeys(["app_logo_url"]); }} className="text-sm text-error">
                إزالة الشعار (رجوع للرمز الافتراضي)
              </button>
            )}
          </div>
        </section>

        {/* بانر الصفحة الرئيسية */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="products" size={17} className="text-textSecondary" /> بانر الصفحة الرئيسية
          </h2>
          <p className="mb-3 text-xs text-textSecondary">
            الصورة دي بتظهر كشريط فوق الصفحة الرئيسية للعميل، فوق رسمة الدراجة الافتراضية. لو مفيش صورة مرفوعة، الشريط مش بيظهر خالص.
          </p>
          {values.home_banner_image_url && (
            <img src={values.home_banner_image_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
          )}
          <ImageUploadField purpose="catalog" onUploaded={(url) => set("home_banner_image_url", url)} />
          <div className="mt-3 flex flex-wrap gap-3">
            <button onClick={() => saveKeys(["home_banner_image_url"])} className="btn-secondary">حفظ البانر</button>
            {values.home_banner_image_url && (
              <button onClick={() => { set("home_banner_image_url", ""); saveKeys(["home_banner_image_url"]); }} className="text-sm text-error">
                إزالة البانر
              </button>
            )}
          </div>
        </section>

        {/* شريط الإعلانات */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="notifications" size={17} className="text-textSecondary" /> شريط الإعلانات
          </h2>
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div>
              <label className="label">تفعيل الشريط؟</label>
              <select className="input" value={String(values.announcement_bar_enabled ?? false)}
                onChange={(e) => set("announcement_bar_enabled", e.target.value === "true")}>
                <option value="true">نعم</option>
                <option value="false">لا</option>
              </select>
            </div>
            <div>
              <label className="label">نص الرسالة</label>
              <textarea className="input" rows={2} value={values.announcement_bar_text ?? ""}
                onChange={(e) => set("announcement_bar_text", e.target.value)} />
            </div>
          </div>
          <button onClick={() => saveKeys(["announcement_bar_enabled", "announcement_bar_text"])} className="btn-secondary mt-3">حفظ</button>
        </section>

        {/* نصوص وتنبيهات النظام */}
        <section className="card">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Icon name="reports" size={17} className="text-textSecondary" /> نصوص وتنبيهات النظام
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label">نص تنبيه تغيّر الأسعار</label>
              <textarea className="input" rows={2} value={values.price_disclaimer_text ?? ""}
                onChange={(e) => set("price_disclaimer_text", e.target.value)} />
            </div>
            <div>
              <label className="label">رسالة خارج ساعات العمل</label>
              <textarea className="input" rows={2} value={values.outside_working_hours_message ?? ""}
                onChange={(e) => set("outside_working_hours_message", e.target.value)} />
            </div>
            <div>
              <label className="label">رسالة وضع الصيانة</label>
              <textarea className="input" rows={2} value={values.maintenance_message ?? ""}
                onChange={(e) => set("maintenance_message", e.target.value)} />
            </div>
          </div>
          <button
            onClick={() => saveKeys(["price_disclaimer_text", "outside_working_hours_message", "maintenance_message"])}
            className="btn-secondary mt-3"
          >
            حفظ
          </button>
        </section>
      </div>

      {saved && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <p className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-lg ${
            saved.startsWith("فشل") ? "border-error/30 bg-error text-white" : "border-success/30 bg-success text-white"
          }`}>
            <Icon name={saved.startsWith("فشل") ? "close" : "check"} size={15} />
            {saved}
          </p>
        </div>
      )}
    </>
  );
}
