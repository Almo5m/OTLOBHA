"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

export default function InlinePrice({ productId, price }: { productId: string; price: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(price));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function handleSave() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) { setError(true); return; }

    setSaving(true);
    const { error: updateError } = await supabase.from("products").update({ last_known_price: parsed }).eq("id", productId);
    setSaving(false);
    if (updateError) { setError(true); return; }

    setError(false);
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setValue(String(price));
    setError(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="تعديل السعر"
        className="numeric rounded-sm px-1.5 py-0.5 text-sm font-medium hover:bg-surfaceElevated"
      >
        {price} <span className="font-normal text-textSecondary">ج.م</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number" dir="ltr" min={0} step="0.01" autoFocus value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
        className={`input !w-20 !px-2 !py-1 text-sm ${error ? "input-error" : ""}`}
      />
      <button onClick={handleSave} disabled={saving} title="حفظ" className="rounded-sm p-1 text-success hover:bg-surfaceElevated">
        <Icon name="check" size={16} />
      </button>
      <button onClick={handleCancel} title="إلغاء" className="rounded-sm p-1 text-textSecondary hover:bg-surfaceElevated">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
