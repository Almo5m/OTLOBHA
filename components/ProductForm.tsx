"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "./ImageUploadField";

export default function ProductForm({ categories, units, subcategories }: { categories: any[]; units: any[]; subcategories: any[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", description: "", categoryId: categories[0]?.id ?? "", unitId: units[0]?.id ?? "",
    subcategoryId: "", price: "", imageUrl: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSubcategories = subcategories.filter((s) => s.category_id === form.categoryId);

  async function handleSubmit() {
    if (!form.name.trim() || !form.categoryId || !form.unitId) { setError("يرجى إكمال البيانات الأساسية"); return; }
    setLoading(true);
    const { error } = await supabase.from("products").insert({
      name: form.name, description: form.description, category_id: form.categoryId,
      sale_unit_id: form.unitId, subcategory_id: form.subcategoryId || null,
      last_known_price: Number(form.price) || 0, image_url: form.imageUrl || null
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setForm({ ...form, name: "", description: "", price: "", imageUrl: "", subcategoryId: "" });
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">إضافة منتج جديد</h2>
      <input className="input" placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <textarea className="input" placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="flex gap-2">
        <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: "" })}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      {availableSubcategories.length > 0 && (
        <select className="input" value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}>
          <option value="">بدون تصنيف فرعي</option>
          {availableSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <input type="number" dir="ltr" className="input" placeholder="آخر سعر معروف (تقريبي)" value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <ImageUploadField onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary">إضافة المنتج</button>
    </div>
  );
}
