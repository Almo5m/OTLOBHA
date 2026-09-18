"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProductRowActions({ productId, status, price }: { productId: string; status: string; price: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newPrice, setNewPrice] = useState(price);

  async function toggleStatus() {
    setLoading(true);
    await supabase.from("products").update({ status: status === "active" ? "inactive" : "active" }).eq("id", productId);
    setLoading(false);
    router.refresh();
  }

  async function savePrice() {
    setLoading(true);
    await supabase.from("products").update({ last_known_price: newPrice }).eq("id", productId);
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {editing ? (
        <div className="flex items-center gap-1">
          <input type="number" dir="ltr" className="w-20 rounded-sm border border-line px-1 py-0.5 text-sm"
            value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} />
          <button onClick={savePrice} disabled={loading} className="text-xs text-primary underline">حفظ</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="text-xs text-primary underline">تعديل السعر</button>
      )}
      <button onClick={toggleStatus} disabled={loading} className="text-xs text-accent underline">
        {status === "active" ? "إيقاف المنتج" : "إعادة تفعيل"}
      </button>
    </div>
  );
}
