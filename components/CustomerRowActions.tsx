"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function CustomerRowActions({ customerId, status }: { customerId: string; status: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const next = status === "active" ? "blocked" : "active";
    await supabase.from("users").update({ status: next }).eq("id", customerId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={toggle} disabled={loading} className="text-sm text-primary underline">
      {status === "active" ? "حظر" : "إلغاء الحظر"}
    </button>
  );
}
