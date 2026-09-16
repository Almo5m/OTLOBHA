"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "./ImageUploadField";
import IconBadge from "./IconBadge";
import Image from "next/image";

export default function CategoryImageEditor({ categoryId, imageUrl }: { categoryId: string; imageUrl: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUploaded(url: string) {
    setLoading(true);
    await supabase.from("categories").update({ image_url: url }).eq("id", categoryId);
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="w-40 shrink-0">
        <ImageUploadField onUploaded={handleUploaded} />
        <button onClick={() => setEditing(false)} className="mt-1 text-xs text-textSecondary underline">إلغاء</button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditing(true)} className="group relative shrink-0" disabled={loading} title="تغيير الصورة">
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={48} height={48} className="rounded-md object-cover" />
      ) : (
        <IconBadge name="market" size="md" />
      )}
      <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-[10px] text-white opacity-0 transition-opacity duration-fast group-hover:opacity-100">
        تغيير
      </span>
    </button>
  );
}
