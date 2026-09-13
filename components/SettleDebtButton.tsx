"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettleDebtButton({ debtId, remaining }: { debtId: string; remaining: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState(remaining);
  const [loading, setLoading] = useState(false);

  async function handleSettle() {
    setLoading(true);
    await supabase.rpc("settle_debt", { p_debt_id: debtId, p_amount: amount, p_notes: null });
    setLoading(false);
    router.refresh();
  }

  if (!show) return <button onClick={() => setShow(true)} className="text-sm text-primary underline">تسجيل سداد</button>;

  return (
    <div className="flex items-center gap-2">
      <input type="number" className="w-24 rounded-sm border border-line px-2 py-1 text-sm" value={amount}
        onChange={(e) => setAmount(Number(e.target.value))} />
      <button onClick={handleSettle} disabled={loading} className="text-sm text-primary underline">تأكيد</button>
    </div>
  );
}
