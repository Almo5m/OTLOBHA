"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type WordmarkVariant = "default" | "onDark" | "onLight" | "mono" | "compact";

/**
 * الشعار الأساسي لـ«المنيب جو».
 * لو الأدمن رفع أيقونة/شعار مخصص من لوحة التحكم (platform_settings.app_logo_url)
 * بيستبدل تلقائيًا المونوجرام الافتراضي (مربع بلون البراند وحرف "م") + النص
 * في كل مكان يظهر فيه الشعار — مش بس الـnavbar.
 */
export default function Wordmark({
  variant = "default",
  className = ""
}: {
  variant?: WordmarkVariant;
  className?: string;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "app_logo_url")
      .single()
      .then(({ data }) => {
        if (active && typeof data?.value === "string" && data.value) setLogoUrl(data.value);
      });
    return () => {
      active = false;
    };
  }, []);

  if (variant === "compact") {
    if (logoUrl) {
      return <img src={logoUrl} alt="المنيب جو" className={`h-8 w-8 shrink-0 rounded-xl object-cover ${className}`} />;
    }
    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-base font-extrabold text-inkContrast ${className}`}
        aria-label="المنيب جو"
      >
        م
      </span>
    );
  }

  const textColorClass =
    variant === "onDark" ? "text-white" : variant === "onLight" ? "text-[#131315]" : variant === "mono" ? "text-current" : "text-textPrimary";

  const monogramClass =
    variant === "mono"
      ? "bg-current/10 text-current"
      : "bg-brand text-inkContrast";

  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`} aria-label="المنيب جو">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${monogramClass}`}>
          م
        </span>
      )}
      <span className={`text-2xl font-black leading-none tracking-tight ${textColorClass}`}>المنيب جو</span>
    </span>
  );
}
