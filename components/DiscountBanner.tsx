"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";

// خصمك الخاص (أو العام) — مختلف عن PerksAlert (اللي بيهتم بس بتنبيهات
// العروض المشروطة زي "اطلب مرة كمان") عشان يبان بوضوح فوق الصفحة الرئيسية
// من غير ما يستنى العميل ينزل لتحت
export default function DiscountBanner() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_active_perks").then(({ data }) => {
      const discount = (data ?? []).find((p: { kind: string }) => p.kind === "discount");
      setLabel(discount?.label ?? null);
    });
  }, []);

  if (!label) return null;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-accent bg-accent-soft px-5 py-4 text-accent-strong animate-fadeIn">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-inkContrast">
        <Icon name="wallet" size={22} />
      </span>
      <div>
        <p className="text-base font-bold sm:text-lg">{label}</p>
        <p className="text-xs opacity-80">هيتطبّق تلقائيًا على طلبك الجاي</p>
      </div>
    </div>
  );
}
