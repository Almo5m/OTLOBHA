"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";
import ImageUploadField from "./ImageUploadField";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center justify-between rounded-md bg-surfaceElevated px-3 py-2 text-sm">
      <div>
        <p className="text-xs text-textSecondary">{label}</p>
        <p className="numeric font-medium">{value}</p>
      </div>
      <button type="button" onClick={handleCopy} className="btn-ghost px-2 py-1 text-xs">
        {copied ? "تم النسخ ✓" : "نسخ"}
      </button>
    </div>
  );
}

export default function PaymentProofUpload({
  method, onChange
}: {
  method: "wallet" | "instapay";
  onChange: (imageUrl: string) => void;
}) {
  const [details, setDetails] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const key = method === "wallet" ? "payment_wallet_details" : "payment_instapay_details";
    supabase.from("platform_settings").select("value").eq("key", key).single()
      .then(({ data }) => setDetails(data?.value ?? null));
  }, [method]);

  useEffect(() => {
    onChange(imageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return (
    <div className="card mb-4 space-y-3">
      <h2 className="flex items-center gap-2 font-medium">
        <Icon name="wallet" size={17} className="text-textSecondary" /> بيانات التحويل
      </h2>

      {details ? (
        <div className="space-y-2">
          {method === "wallet" ? (
            <>
              <CopyRow label="رقم المحفظة" value={details.number} />
              <CopyRow label="الاسم المسجّل" value={details.name} />
            </>
          ) : (
            <>
              <CopyRow label="حساب InstaPay" value={details.handle} />
              <CopyRow label="الاسم المسجّل" value={details.name} />
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-textSecondary">جارٍ تحميل بيانات الحساب...</p>
      )}

      <div className="alert alert-warning">
        التحويل اختياري دلوقتي: تقدر تدفع كاش عند الاستلام. لو هتحوّل، المبلغ النهائي هو السعر الفعلي وقت الشراء (هتلاقيه في فاتورتك)، وأي فرق بيتسوّى وقت التسليم.
      </div>

      <div className="text-xs text-textSecondary">لو حوّلت، ارفع صورة التحويل (اختياري) عشان نتأكد منه بسرعة:</div>
      <ImageUploadField purpose="payment-proof" onUploaded={setImageUrl} />
    </div>
  );
}
