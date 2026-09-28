"use client";

import { useEffect, useState } from "react";
import { sanitizeNumericInput } from "@/lib/format/digits";

// input عادي بـ type="number" بيرفض لوحة مفاتيح الأرقام العربية على أغلب
// الموبايلات (بتفضل القيمة فاضية أو صفر مهما كتب المستخدم). ده بديل بـ
// type="text" بيتعامل مع أي لوحة مفاتيح، وبيسمح للمستخدم يمسح الرقم
// ويكتب واحد جديد من غير ما يترجع لصفر وهو لسه بيكتب.
export default function QuantityInput({
  value, onChange, min = 0.5, className
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    if (Number(raw) !== value) setRaw(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cleaned = sanitizeNumericInput(e.target.value);
    setRaw(cleaned);
    const parsed = Number(cleaned);
    if (cleaned !== "" && cleaned !== "." && !Number.isNaN(parsed)) onChange(parsed);
  }

  function handleBlur() {
    const parsed = Number(raw);
    if (raw === "" || raw === "." || Number.isNaN(parsed) || parsed < min) {
      setRaw(String(min));
      onChange(min);
    }
  }

  return (
    <input
      type="text" inputMode="decimal" dir="ltr" value={raw}
      onChange={handleChange} onBlur={handleBlur}
      className={className}
    />
  );
}
