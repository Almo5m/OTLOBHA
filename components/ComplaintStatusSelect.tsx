"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const OPTIONS = ["new", "under_review", "resolved", "closed"];
const LABELS: Record<string, string> = { new: "جديدة", under_review: "قيد المراجعة", resolved: "تم الحل", closed: "مغلقة" };

export default function ComplaintStatusSelect({ complaintId, status }: { complaintId: string; status: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(next: string) {
    setLoading(true);
    await supabase.from("complaints").update({
      status: next,
      resolved_at: next === "resolved" || next === "closed" ? new Date().toISOString() : null
    }).eq("id", complaintId);
    setLoading(false);
    router.refresh();
  }

  return (
    <select className="rounded-sm border border-line px-2 py-1 text-sm" value={status} disabled={loading}
      onChange={(e) => handleChange(e.target.value)}>
      {OPTIONS.map((o) => <option key={o} value={o}>{LABELS[o]}</option>)}
    </select>
  );
}
