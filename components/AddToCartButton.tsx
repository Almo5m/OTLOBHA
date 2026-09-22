"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";

// الوحدات اللي بتتباع بالوزن/الحجم بتحتاج خطوة كسرية (نص كيلو، ربع لتر...)
// عكس القطعة والعبوة اللي بتتزاد وحدة وحدة بس
function stepFor(unitName: string) {
  if (unitName?.includes("كيلو") || unitName?.includes("لتر")) return 0.25;
  if (unitName?.includes("جرام")) return 50;
  return 1;
}
function minFor(unitName: string) {
  return unitName?.includes("جرام") ? 50 : stepFor(unitName);
}

export default function AddToCartButton({
  type, productId, productName, imageUrl, manualName, displayedPrice, unitId, unitName, className = ""
}: {
  type: "catalog" | "manual";
  productId?: string;
  productName?: string;
  imageUrl?: string | null;
  manualName?: string;
  displayedPrice?: number;
  unitId: string;
  unitName: string;
  className?: string;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const step = stepFor(unitName);
  const [quantity, setQuantity] = useState(minFor(unitName));
  const [added, setAdded] = useState(false);

  function clamp(v: number) {
    const stepped = Math.round(v / step) * step;
    const rounded = Math.round(stepped * 100) / 100; // تفادي أخطاء الفاصلة العشرية (0.1 + 0.2 مشكلة جافاسكريبت الشهيرة)
    return Math.max(minFor(unitName), rounded);
  }

  function handleAdd() {
    addItem({
      key: crypto.randomUUID(),
      type, productId, productName, imageUrl, manualName, displayedPrice,
      quantity, unitId, unitName
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  const total = typeof displayedPrice === "number" ? (displayedPrice * quantity).toFixed(2) : null;

  return (
    <div className={`flex shrink-0 flex-col gap-1.5 ${className}`}>
      {/* تحديد الكمية بالوحدة الفعلية للمنتج (كيلو، جرام، قطعة...) — عشان
          العميل يحدد "كام" بالظبط والسعر يتحسب صح قبل ما يضيف للسلة */}
      <div className="flex items-center justify-between gap-1 rounded-lg border border-borderc py-1">
        <button
          type="button" onClick={() => setQuantity((q) => clamp(q - step))}
          className="flex h-6 w-7 items-center justify-center text-base leading-none text-textSecondary hover:text-textPrimary"
          aria-label="تقليل الكمية"
        >
          −
        </button>
        <span className="numeric text-xs font-medium">
          {quantity} {unitName}
        </span>
        <button
          type="button" onClick={() => setQuantity((q) => clamp(q + step))}
          className="flex h-6 w-7 items-center justify-center text-base leading-none text-textSecondary hover:text-textPrimary"
          aria-label="زيادة الكمية"
        >
          +
        </button>
      </div>
      <button onClick={handleAdd} className="btn-secondary w-full py-1.5 text-xs">
        {added ? "أُضيف ✓" : total ? `إضافة · ${total} ج.م` : "+ إضافة"}
      </button>
    </div>
  );
}
