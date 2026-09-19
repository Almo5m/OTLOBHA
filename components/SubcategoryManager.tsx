"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

export default function SubcategoryManager({
  categoryId, subcategories
}: { categoryId: string; subcategories: { id: string; name: string }[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("product_subcategories").insert({
      category_id: categoryId, name: name.trim(), sort_order: subcategories.length
    });
    setLoading(false);
    if (!error) { setName(""); router.refresh(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف التصنيف الفرعي ده؟ المنتجات اللي فيه هتفضل موجودة بس من غير تصنيف فرعي.")) return;
    setLoading(true);
    await supabase.from("product_subcategories").delete().eq("id", id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-2 border-t border-borderc pt-2">
      <p className="mb-1.5 text-xs font-medium text-textSecondary">التصنيفات الفرعية (مثال: معلبات، مجمدات)</p>
      <div className="flex flex-wrap gap-1.5">
        {subcategories.map((s) => (
          <span key={s.id} className="flex items-center gap-1 rounded-full border border-borderc py-1 pr-1 pl-2.5 text-xs">
            {s.name}
            <button onClick={() => handleDelete(s.id)} disabled={loading} className="flex h-4 w-4 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated">
              <Icon name="close" size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="اسم تصنيف فرعي جديد"
          className="input h-8 flex-1 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button onClick={handleAdd} disabled={loading || !name.trim()} className="btn-secondary px-3 py-1 text-xs">إضافة</button>
      </div>
    </div>
  );
}
