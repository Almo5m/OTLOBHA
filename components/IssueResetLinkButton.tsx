"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function IssueResetLinkButton({ phone }: { phone: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const { data: token, error } = await supabase.rpc("request_password_reset", { p_customer_phone: phone });
    setLoading(false);
    if (error) { setError(error.message); return; }

    const resetUrl = `${window.location.origin}/reset-password?token=${token}`;
    const message = `مرحبًا، لإعادة تعيين كلمة المرور الخاصة بحسابك في اطلبها، اضغط على الرابط التالي: ${resetUrl}`;
    window.open(`https://wa.me/2${phone}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className="text-sm text-primary underline">
        إعادة تعيين كلمة المرور
      </button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
