"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AvailabilityToggle({ status }: { status: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [current, setCurrent] = useState(status);

  async function toggle() {
    const next = current === "available" ? "offline" : "available";
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("agent_profiles").update({ availability_status: next }).eq("user_id", user?.id);
    setCurrent(next);
    router.refresh();
  }

  const isAvailable = current === "available";

  return (
    <button
      onClick={toggle}
      disabled={current === "busy"}
      className={`rounded-sm px-3 py-1.5 text-sm ${
        isAvailable ? "bg-primary text-paper" : current === "busy" ? "bg-line text-textSecondary" : "bg-line/40 text-textSecondary"
      }`}
    >
      {current === "busy" ? "مشغول بطلب حاليًا" : isAvailable ? "متاح — اضغط للإيقاف" : "غير متاح — اضغط للتفعيل"}
    </button>
  );
}
