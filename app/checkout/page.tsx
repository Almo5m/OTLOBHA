"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CustomerNav from "@/components/CustomerNav";
import Icon from "@/components/Icon";
import PaymentProofUpload from "@/components/PaymentProofUpload";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device-id";
import { saveOrder } from "@/lib/saved-orders";
import { toWesternDigits } from "@/lib/format/digits";
import { googleMapsUrl } from "@/lib/whatsapp";

type Method = "cash" | "wallet" | "instapay";
const CONTACT_KEY = "mg_contact";

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { items, clear } = useCartStore();

  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("cash");
  const [proofUrl, setProofUrl] = useState("");
  const [enabled, setEnabled] = useState({ cash: true, wallet: false, instapay: false });
  const [disclaimer, setDisclaimer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // نفس بيانات المرة اللي فاتت على الجهاز ده (لو موجودة) عشان العميل ميكتبهاش تاني
    try {
      const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        setForm((f) => ({
          ...f,
          name: String(saved.name ?? ""), phone: String(saved.phone ?? ""), address: String(saved.address ?? "")
        }));
      }
    } catch {}

    supabase.from("platform_settings")
      .select("key,value")
      .in("key", ["price_disclaimer_text", "cash_payment_enabled", "wallet_payment_enabled", "instapay_payment_enabled"])
      .then(({ data }) => {
        const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
        const next = {
          cash: byKey.cash_payment_enabled !== false,
          wallet: byKey.wallet_payment_enabled === true,
          instapay: byKey.instapay_payment_enabled === true
        };
        setEnabled(next);
        setDisclaimer(typeof byKey.price_disclaimer_text === "string" ? byKey.price_disclaimer_text : "");
        setMethod((m) => (next[m] ? m : next.cash ? "cash" : next.wallet ? "wallet" : "instapay"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function shareLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("المتصفح ده مش بيدعم تحديد الموقع — اكتب العنوان بالتفصيل");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError("مقدرناش نحدد موقعك — اسمح للموقع بالوصول للوكيشن، أو اكتب العنوان بالتفصيل");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSubmit() {
    setError(null);
    if (items.length === 0) { setError("طلبك فاضي — ضيف صنف الأول"); return; }

    const phone = toWesternDigits(form.phone).replace(/\s/g, "");
    if (form.name.trim().length < 2) { setError("اكتب اسمك"); return; }
    if (!/^01[0125][0-9]{8}$/.test(phone)) { setError("رقم الموبايل لازم يكون رقم مصري من 11 رقم (مثال: 01012345678)"); return; }
    if (form.address.trim().length < 5) { setError("اكتب عنوان التوصيل بالتفصيل"); return; }

    setLoading(true);
    const payload = items.map((i) => ({
      type: i.type,
      product_id: i.productId,
      manual_name: i.manualName,
      quantity: i.quantity,
      unit_id: i.unitId,
      comment: i.comment,
      category_id: i.manualCategoryId,
      image_url: i.type === "manual" ? i.imageUrl : undefined,
      target_price: i.type === "manual" ? i.targetPrice : undefined
    }));

    const { data, error: rpcError } = await supabase.rpc("create_guest_order", {
      p_customer_name: form.name.trim(),
      p_customer_phone: phone,
      p_address_text: form.address.trim(),
      p_location_lat: location?.lat ?? null,
      p_location_lng: location?.lng ?? null,
      p_customer_notes: form.notes.trim() || null,
      p_payment_method: method,
      p_items: payload,
      p_device_id: getDeviceId(),
      p_payment_proof_url: method !== "cash" && proofUrl ? proofUrl : null
    });
    setLoading(false);

    const created = Array.isArray(data) ? data[0] : data;
    if (rpcError || !created?.new_tracking_token) {
      setError(rpcError?.message ?? "حصلت مشكلة وإحنا بنبعت الطلب — جرّب تاني");
      return;
    }

    try {
      localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: form.name.trim(), phone, address: form.address.trim() }));
    } catch {}
    saveOrder({ token: created.new_tracking_token, number: "", createdAt: new Date().toISOString() });

    clear();
    router.push(`/order/${created.new_tracking_token}?new=1`);
  }

  const methods: [Method, string][] = [["cash", "كاش عند الاستلام"], ["wallet", "محفظة إلكترونية"], ["instapay", "InstaPay"]];

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">بياناتك</h1>
          <Link href="/cart" className="text-sm text-accent underline underline-offset-2">رجوع لأصنافك ({items.length})</Link>
        </div>

        <div className="card mb-4 space-y-3">
          <div>
            <label className="label" htmlFor="name">الاسم</label>
            <input id="name" className="input" autoComplete="name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="phone">رقم الموبايل</label>
            <input id="phone" className="input" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: toWesternDigits(e.target.value) })} />
            <p className="mt-1 text-xs text-textSecondary">هنبعتلك رابط متابعة الطلب والفاتورة على واتساب على الرقم ده.</p>
          </div>
          <div>
            <label className="label" htmlFor="address">عنوان التوصيل</label>
            <textarea id="address" className="input" rows={2} autoComplete="street-address"
              placeholder="الشارع، رقم العمارة، الدور، علامة مميزة..."
              value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div>
            {location ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-surfaceElevated px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 text-success">
                  <Icon name="check" size={14} /> تم تحديد موقعك
                  <a href={googleMapsUrl(location.lat, location.lng)} target="_blank" rel="noreferrer"
                    className="mr-1 text-xs text-accent underline underline-offset-2">شوفه على الخريطة</a>
                </span>
                <button type="button" onClick={() => setLocation(null)} className="text-xs text-error">إزالة</button>
              </div>
            ) : (
              <button type="button" onClick={shareLocation} disabled={locating} className="btn-secondary w-full">
                <Icon name="location" size={16} />
                {locating ? "جارٍ تحديد موقعك..." : "ابعت موقعك على الخريطة (اختياري)"}
              </button>
            )}
            {locationError && <p className="mt-1 text-xs text-error">{locationError}</p>}
          </div>

          <div>
            <label className="label" htmlFor="notes">ملاحظات (اختياري)</label>
            <textarea id="notes" className="input" rows={2} placeholder="أي حاجة تحب المندوب يعرفها"
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        {methods.filter(([m]) => enabled[m]).length > 1 && (
          <div className="card mb-4">
            <h2 className="mb-3 font-medium">طريقة الدفع</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {methods.filter(([m]) => enabled[m]).map(([val, label]) => (
                <label key={val} className="flex items-center gap-1.5">
                  <input type="radio" name="payment" checked={method === val} onChange={() => setMethod(val)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}

        {method !== "cash" && <PaymentProofUpload method={method} onChange={setProofUrl} />}

        {disclaimer && (
          <div className="alert alert-info mb-4 flex items-start gap-2">
            <Icon name="invoice" size={16} className="mt-0.5 shrink-0" />
            <span>{disclaimer}</span>
          </div>
        )}

        {error && <p className="mb-3 text-sm text-error">{error}</p>}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </button>
        <p className="mt-3 text-center text-xs text-textSecondary">
          بإرسالك الطلب أنت موافق على{" "}
          <Link href="/legal/terms" target="_blank" className="underline underline-offset-2">الشروط والأحكام</Link>.
        </p>
      </main>
    </>
  );
}
