"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("user_sessions").update({ revoked_at: new Date().toISOString(), revoked_by: user?.id }).eq("id", sessionId);
    setLoading(false);
    router.refresh();
  }

  return <button onClick={handleRevoke} disabled={loading} className="text-sm text-error">إنهاء الجلسة</button>;
}
