"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";

/**
 * زرار/رابط "تواصل معانا" بيفتح واتساب على رقم الدعم اللي السوبر أدمن حاطّه
 * في الإعدادات (platform_settings.support_whatsapp_number). لو الرقم لسه
 * مش متحطّ، بيختفي الزرار تلقائيًا بدل ما يودّي لرابط فاضي.
 */
export default function ContactSupportLink({
  label = "تواصل معانا على واتساب",
  message = "مرحبًا، محتاج مساعدة بخصوص حسابي في المنيب جو.",
  className = "",
  variant = "link"
}: {
  label?: string;
  message?: string;
  className?: string;
  variant?: "link" | "button";
}) {
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "support_whatsapp_number")
      .single()
      .then(({ data }) => {
        if (active && typeof data?.value === "string" && data.value) setNumber(data.value);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!number) return null;

  const url = `https://wa.me/2${number}?text=${encodeURIComponent(message)}`;
  const baseClass = variant === "button" ? "btn-secondary" : "inline-flex items-center gap-1.5 text-accent underline underline-offset-2";

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${baseClass} ${className}`}>
      <Icon name="complaints" size={variant === "button" ? 16 : 14} />
      {label}
    </a>
  );
}
