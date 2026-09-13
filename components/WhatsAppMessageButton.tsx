"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WhatsAppMessageButton({ orderId, eventKey, label }: { orderId: string; eventKey: string; label: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("generate_prepared_message", { p_event_key: eventKey, p_order_id: orderId });
    setLoading(false);
    if (error) { setError(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.customer_phone) { setError("لا يوجد رقم هاتف للعميل"); return; }
    const url = `https://wa.me/2${row.customer_phone}?text=${encodeURIComponent(row.message_text)}`;
    window.open(url, "_blank");
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className="btn-secondary text-sm">
        {loading ? "جارٍ التجهيز..." : label}
      </button>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
