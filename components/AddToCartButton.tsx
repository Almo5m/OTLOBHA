"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";

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
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      key: crypto.randomUUID(),
      type, productId, productName, imageUrl, manualName, displayedPrice,
      quantity: 1, unitId, unitName
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  // الكمية بتتظبط من السلة نفسها بعد الإضافة — بلاش Stepper على كل كارت،
  // ده اللي كان بيوسّع الكارت من غير داعي. عرض الزرار بيتحدد من مكان
  // استخدامه (className) بدل ما يكون w-full ثابت يكسر أي صف أفقي.
  return (
    <button onClick={handleAdd} className={`btn-secondary shrink-0 py-1.5 text-sm ${className}`}>
      {added ? "أُضيف ✓" : "+ إضافة"}
    </button>
  );
}
