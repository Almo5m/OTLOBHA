"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "./ImageUploadField";
import IconBadge from "./IconBadge";
import Image from "next/image";

export default function ProductImageEditor({ productId, imageUrl }: { productId: string; imageUrl: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUploaded(url: string) {
    setLoading(true);
    await supabase.from("products").update({ image_url: url }).eq("id", productId);
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="w-36 shrink-0">
        <ImageUploadField purpose="catalog" onUploaded={handleUploaded} />
        <button onClick={() => setEditing(false)} className="mt-1 text-xs text-textSecondary underline">إلغاء</button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="group relative shrink-0" disabled={loading} title="إضافة/تغيير الصورة">
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={44} height={44} className="rounded-md object-cover" />
      ) : (
        <IconBadge name="products" size="sm" />
      )}
      <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-[9px] text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100">
        {imageUrl ? "تغيير" : "إضافة"}
      </span>
    </button>
  );
}
