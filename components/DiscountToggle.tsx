"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DiscountToggle({ id, isActive, table = "customer_discounts" }: { id: string; isActive: boolean; table?: "customer_discounts" | "promotions" }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await supabase.from(table).update({ is_active: !isActive }).eq("id", id);
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={toggle} disabled={loading} className="text-sm text-accent underline">
      {isActive ? "إيقاف" : "تفعيل"}
    </button>
  );
}
