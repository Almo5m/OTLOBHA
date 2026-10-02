"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClaimOrderButton({ orderId, basePath = "/agent/orders" }: { orderId: string; basePath?: string }) {
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
      // الأغلب إن إداري تاني سبقك بجزء من الثانية — الطلب هيختفي من القائمة تلقائيًا
      setError(rpcError.message);
      router.refresh();
      return;
    }
    router.push(`${basePath}/${orderId}`);
  }

  return (
    <div>
      <button onClick={handleClaim} disabled={loading} className="btn-primary w-full text-sm">
        {loading ? "جارٍ الاستلام..." : "استلام الطلب"}
      </button>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
