"use client";

import { useEffect, useState } from "react";
import { sanitizeNumericInput } from "@/lib/format/digits";

/**
 * حقل رقم بيحتفظ بالنص اللي بيكتبه المستخدم (مش بيحوّله لرقم في كل ضغطة).
 * input type="number" المتحكَّم فيه بـ Number() بيمنع مسح القيمة وكتابة الكسور
 * زي "0.1" لأن "0." بترجع 0 وتتمسح النقطة — فبنستخدم نص + لوحة أرقام.
 */
export default function NumberField({
  value, onValue, className = "input", ...rest
}: {
  value: number | null | undefined;
  onValue: (n: number) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(value == null ? "" : String(value));

  // لو القيمة اتغيّرت من بره (تحميل الإعدادات) ومختلفة عما كتبه المستخدم، نحدّث النص
  useEffect(() => {
    if (value != null && Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      dir="ltr"
      className={className}
      value={text}
      onChange={(e) => {
        const clean = sanitizeNumericInput(e.target.value);
        setText(clean);
        onValue(clean === "" || clean === "." ? 0 : Number(clean));
      }}
    />
  );
}
