"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CategoryToggle({ categoryId, isActive }: { categoryId: string; isActive: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const { error } = await supabase.from("categories").update({ is_active: !isActive }).eq("id", categoryId);
    setLoading(false);
    if (!error) router.refresh();
  }

  return (
    <button onClick={toggle} disabled={loading} className="text-xs text-primary underline">
      {isActive ? "تعطيل" : "تفعيل"}
    </button>
  );
}
