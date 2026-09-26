"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [alreadyAgreedPolicyId, setAlreadyAgreedPolicyId] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState({ imageUrl: "", senderName: "", senderNumber: "" });
  const [enabledMethods, setEnabledMethods] = useState({ wallet: true, instapay: true });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      // فلتر صريح بمعرّف المستخدم الحالي بدل ما نعتمد على RLS بس — عشان
      // لو الحساب اللي بتختبر بيه أدمن، RLS بتسمحله يشوف عناوين كل العملاء
      // لأغراض الدعم، لكن هنا في شاشة "طلب لنفسي" لازم يشوف عنوانه هو بس
      supabase.from("addresses").select("*").eq("customer_id", user.id).then(({ data }) => {
        setAddresses(data ?? []);
        const def = data?.find((a) => a.is_default);
        if (def) setAddressId(def.id);
      });
      supabase.from("users").select("terms_agreed_policy_id").eq("id", user.id).single()
        .then(({ data }) => setAlreadyAgreedPolicyId(data?.terms_agreed_policy_id ?? null));
    });
    supabase.from("platform_settings").select("value").eq("key", "price_disclaimer_text").single()
      .then(({ data }) => setDisclaimer(data?.value ?? ""));
    supabase.from("platform_settings").select("key,value").in("key", ["wallet_payment_enabled", "instapay_payment_enabled"])
      .then(({ data }) => {
        const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
        setEnabledMethods({
          wallet: byKey.wallet_payment_enabled ?? true,
          instapay: byKey.instapay_payment_enabled ?? true
        });
      });
    supabase.from("policies").select("id").eq("type", "terms").order("published_at", { ascending: false }).limit(1).single()
      .then(({ data }) => setPolicyId(data?.id ?? null));
  }, []);

  useEffect(() => {
    if ((paymentMethod === "wallet" && !enabledMethods.wallet) || (paymentMethod === "instapay" && !enabledMethods.instapay)) {
      setPaymentMethod("cash");
    }
  }, [enabledMethods, paymentMethod]);

  // لو العميل موافق قبل كده على نفس نسخة السياسة، منطلبش موافقة تانية
  const alreadyAgreed = !!policyId && policyId === alreadyAgreedPolicyId;
  const needsAgreement = !alreadyAgreed;

  async function handleSubmit() {
    setError(null);
    if (items.length === 0) { setError("السلة فارغة"); return; }
    if (needsAgreement && !agreed) { setError("يجب الموافقة على الشروط والسياسات أولاً"); return; }
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
      comment: i.comment,
      category_id: i.manualCategoryId,
      image_url: i.type === "manual" ? i.imageUrl : undefined,
      target_price: i.type === "manual" ? i.targetPrice : undefined
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

    // نسجّل موافقته على نسخة السياسة دي عشان مايتسألش تاني في نفس النسخة
    if (needsAgreement && policyId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("users").update({ terms_agreed_policy_id: policyId }).eq("id", user.id);
    }

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
          <button
            className="btn-secondary mt-2 px-3 py-1.5 text-xs"
            onClick={() => setUseCustom(!useCustom)}
          >
            <Icon name="location" size={13} />
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
            {[["cash", "كاش"], ["wallet", "محفظة إلكترونية"], ["instapay", "InstaPay"]]
              .filter(([val]) => val === "cash" || (val === "wallet" ? enabledMethods.wallet : val === "instapay" ? enabledMethods.instapay : true))
              .map(([val, label]) => (
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

        {needsAgreement ? (
          <div className="mb-4 rounded-lg border border-borderc p-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>
                أوافق على{" "}
                <Link href="/legal/terms" target="_blank" className="font-medium text-accent underline underline-offset-2">
                  الشروط والأحكام
                </Link>{" "}
                و
                <Link href="/legal/privacy" target="_blank" className="font-medium text-accent underline underline-offset-2">
                  سياسة الخصوصية
                </Link>
                ، وعلى أن الأسعار قابلة للتغيير حسب السعر الفعلي وقت الشراء.
              </span>
            </label>
          </div>
        ) : (
          <p className="mb-4 flex items-center gap-1.5 text-xs text-textSecondary">
            <Icon name="check" size={13} className="text-success" /> تمت الموافقة على الشروط والأحكام مسبقًا.
          </p>
        )}

        {error && <p className="mb-3 text-sm text-error">{error}</p>}

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </button>
      </main>
    </>
  );
}
