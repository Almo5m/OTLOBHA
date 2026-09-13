"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  { value: "customer", label: "عميل" },
  { value: "delivery_agent", label: "مندوب توصيل" },
  { value: "business_admin", label: "إداري (Business Admin)" },
  { value: "super_admin", label: "Super Admin" }
];

export default function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    if (!confirm(`تأكيد تغيير الدور إلى "${ROLES.find((r) => r.value === next)?.label}"؟`)) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("users").update({ role: next }).eq("id", userId);

    // لو الدور الجديد مندوب توصيل، نتأكد من وجود صف في agent_profiles
    if (!error && next === "delivery_agent") {
      await supabase.from("agent_profiles").upsert({ user_id: userId }, { onConflict: "user_id" });
    }

    setLoading(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div>
      <select className="rounded-sm border border-line px-2 py-1 text-sm" value={role} disabled={loading}
        onChange={(e) => handleChange(e.target.value)}>
        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
