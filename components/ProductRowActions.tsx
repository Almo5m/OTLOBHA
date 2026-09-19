"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProductRowActions({
  productId,
  status,
  price,
  categoryId,
  subcategoryId,
  subcategories,
}: {
  productId: string;
  status: string;
  price: number;
  categoryId: string;
  subcategoryId: string | null;
  subcategories: any[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newPrice, setNewPrice] = useState(price);

  const availableSubcategories = subcategories.filter(
    (s) => s.category_id === categoryId,
  );

  async function toggleStatus() {
    setLoading(true);
    await supabase
      .from("products")
      .update({ status: status === "active" ? "inactive" : "active" })
      .eq("id", productId);
    setLoading(false);
    router.refresh();
  }

  async function savePrice() {
    setLoading(true);
    await supabase
      .from("products")
      .update({ last_known_price: newPrice })
      .eq("id", productId);
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  async function saveSubcategory(id: string) {
    setLoading(true);
    await supabase
      .from("products")
      .update({ subcategory_id: id || null })
      .eq("id", productId);
    setLoading(false);
    router.refresh();
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const signRes = await fetch("/api/cloudinary-sign", { method: "POST" });
      const sign = await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sign.apiKey);
      formData.append("timestamp", sign.timestamp);
      formData.append("signature", sign.signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const uploaded = await uploadRes.json();

      if (uploaded.secure_url) {
        await supabase
          .from("products")
          .update({ image_url: uploaded.secure_url })
          .eq("id", productId);
      }
    } finally {
      setLoading(false);
      e.target.value = "";
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            dir="ltr"
            className="w-20 rounded-sm border border-line px-1 py-0.5 text-sm"
            value={newPrice}
            onChange={(e) => setNewPrice(Number(e.target.value))}
          />
          <button
            onClick={savePrice}
            disabled={loading}
            className="text-xs text-primary underline"
          >
            حفظ
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-primary underline"
        >
          تعديل السعر
        </button>
      )}
      {availableSubcategories.length > 0 && (
        <select
          className="rounded-sm border border-line px-1.5 py-0.5 text-xs"
          value={subcategoryId ?? ""}
          disabled={loading}
          onChange={(e) => saveSubcategory(e.target.value)}
        >
          <option value="">بدون تصنيف فرعي</option>
          {availableSubcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
      <label className="cursor-pointer text-xs text-primary underline">
        {loading ? "جارٍ الرفع..." : "رفع صورة"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={uploadImage}
          disabled={loading}
        />
      </label>
      <button
        onClick={toggleStatus}
        disabled={loading}
        className="text-xs text-accent underline"
      >
        {status === "active" ? "إيقاف المنتج" : "إعادة تفعيل"}
      </button>
    </div>
  );
}
