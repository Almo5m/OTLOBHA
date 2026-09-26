"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClaimOrderButton({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    setLoading(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("claim_order", { p_order_id: orderId });
    setLoading(false);
    if (rpcError) {
      // الأغلب إن مندوب تاني سبقك بجزء من الثانية — التحديث اللحظي هيشيل
      // الطلب من قائمتك تلقائيًا، الرسالة دي بس توضيح فوري
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button onClick={handleClaim} disabled={loading} className="btn-primary w-full text-sm">
        {loading ? "جارٍ الاستلام..." : "قبول الطلب"}
      </button>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
