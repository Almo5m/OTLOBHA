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
  onChange: (proof: { imageUrl: string; senderName: string; senderNumber: string }) => void;
}) {
  const [details, setDetails] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderNumber, setSenderNumber] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const key = method === "wallet" ? "payment_wallet_details" : "payment_instapay_details";
    supabase.from("platform_settings").select("value").eq("key", key).single()
      .then(({ data }) => setDetails(data?.value ?? null));
  }, [method]);

  useEffect(() => {
    onChange({ imageUrl, senderName, senderNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, senderName, senderNumber]);

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
        حوّل المبلغ التقريبي الظاهر الآن. المبلغ ده مش نهائي — السعر الفعلي هيتحدد لما المندوب يشتري المنتجات وتُعتمد الفاتورة، وأي فرق هيتسوّى وقت التسليم.
      </div>

      <div>
        <label className="label">اسم المُحوِّل</label>
        <input className="input" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
      </div>
      <div>
        <label className="label">رقم المُحوِّل (المحفظة/الحساب اللي حوّلت منه)</label>
        <input className="input" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} />
      </div>
      <ImageUploadField purpose="payment-proof" onUploaded={setImageUrl} />
    </div>
  );
}
