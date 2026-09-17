"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerNav from "@/components/CustomerNav";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import PaymentProofUpload from "@/components/PaymentProofUpload";
import PerksAlert from "@/components/PerksAlert";

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { items, clear } = useCartStore();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [customAddress, setCustomAddress] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet" | "instapay">("cash");
  const [disclaimer, setDisclaimer] = useState("");
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState({ imageUrl: "", senderName: "", senderNumber: "" });

  useEffect(() => {
    supabase.from("addresses").select("*").then(({ data }) => {
      setAddresses(data ?? []);
      const def = data?.find((a) => a.is_default);
      if (def) setAddressId(def.id);
    });
    supabase.from("platform_settings").select("value").eq("key", "price_disclaimer_text").single()
      .then(({ data }) => setDisclaimer(data?.value ?? ""));
    supabase.from("policies").select("id").eq("type", "terms").order("published_at", { ascending: false }).limit(1).single()
      .then(({ data }) => setPolicyId(data?.id ?? null));
  }, []);

  async function handleSubmit() {
    setError(null);
    if (items.length === 0) { setError("السلة فارغة"); return; }
    if (!agreed) { setError("يجب الموافقة على الشروط والسياسات أولاً"); return; }
    if (!addressId && !customAddress.trim()) { setError("يجب تحديد عنوان التسليم"); return; }
    if (paymentMethod !== "cash" && !proof.imageUrl) {
      setError("يجب رفع صورة إثبات التحويل لإتمام الطلب بهذه الطريقة");
      return;
    }

    setLoading(true);
    const payload = items.map((i) => ({
      type: i.type,
      product_id: i.productId,
      manual_name: i.manualName,
      quantity: i.quantity,
      unit_id: i.unitId,
      comment: i.comment
    }));

    const { data, error: rpcError } = await supabase.rpc("create_order", {
      p_items: payload,
      p_address_id: useCustom ? null : addressId,
      p_custom_address_text: useCustom ? customAddress : null,
      p_payment_method: paymentMethod,
      p_policy_id: policyId,
      p_payment_proof_image_url: paymentMethod !== "cash" ? proof.imageUrl : null,
      p_payment_sender_name: paymentMethod !== "cash" ? proof.senderName : null,
      p_payment_sender_number: paymentMethod !== "cash" ? proof.senderNumber : null
    });

    setLoading(false);
    if (rpcError) { setError("حدث خطأ أثناء إرسال الطلب: " + rpcError.message); return; }

    clear();
    router.push(`/orders/${data}`);
  }

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <PerksAlert />
        <h1 className="mb-4 text-xl font-bold">إتمام الطلب</h1>

        <div className="card mb-4">
          <h2 className="mb-3 font-medium">عنوان التسليم</h2>
          {!useCustom && (
            <div className="space-y-2">
              {addresses.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="address" checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)} />
                  {a.label}: {a.full_address_text}
                </label>
              ))}
            </div>
          )}
          <button className="mt-2 text-sm text-primary underline" onClick={() => setUseCustom(!useCustom)}>
            {useCustom ? "استخدام عنوان محفوظ" : "استخدام عنوان مختلف لهذا الطلب"}
          </button>
          {useCustom && (
            <textarea className="input mt-2" rows={2} placeholder="اكتب العنوان بالتفصيل"
              value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />
          )}
        </div>

        <div className="card mb-4">
          <h2 className="mb-3 font-medium">طريقة الدفع</h2>
          <div className="flex gap-3 text-sm">
            {[["cash", "كاش"], ["wallet", "محفظة إلكترونية"], ["instapay", "InstaPay"]].map(([val, label]) => (
              <label key={val} className="flex items-center gap-1.5">
                <input type="radio" name="payment" checked={paymentMethod === val}
                  onChange={() => setPaymentMethod(val as any)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {paymentMethod !== "cash" && (
          <PaymentProofUpload method={paymentMethod} onChange={setProof} />
        )}

        {disclaimer && (
          <div className="alert alert-info mb-4 flex items-start gap-2">
            <Icon name="invoice" size={16} className="mt-0.5 shrink-0" />
            <span>{disclaimer}</span>
          </div>
        )}

        <label className="mb-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          أوافق على الشروط والأحكام وسياسة الخصوصية، وعلى أن الأسعار قابلة للتغيير حسب السعر الفعلي وقت الشراء.
        </label>

        {error && <p className="mb-3 text-sm text-error">{error}</p>}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </button>
      </main>
    </>
  );
}
