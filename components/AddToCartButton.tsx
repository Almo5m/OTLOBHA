"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";

export default function AddToCartButton({
  type, productId, manualName, displayedPrice, unitId, unitName
}: {
  type: "catalog" | "manual";
  productId?: string;
  manualName?: string;
  displayedPrice?: number;
  unitId: string;
  unitName: string;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      key: crypto.randomUUID(),
      type, productId, manualName, displayedPrice,
      quantity, unitId, unitName
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number" min={1} step="0.5" value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="w-16 rounded-sm border border-line px-2 py-1.5 text-center text-sm"
      />
      <button onClick={handleAdd} className="btn-secondary px-3 py-1.5 text-sm">
        {added ? "أُضيف ✓" : "إضافة"}
      </button>
    </div>
  );
}
