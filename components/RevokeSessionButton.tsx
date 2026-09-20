"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setLoading(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("revoke_session", { p_session_id: sessionId });
    setLoading(false);
    if (rpcError) { setError(rpcError.message); return; }
    router.refresh();
  }

  return (
    <div className="text-end">
      <button onClick={handleRevoke} disabled={loading} className="text-sm text-error">إنهاء الجلسة</button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
