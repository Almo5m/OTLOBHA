"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "./ImageUploadField";
import { normalizeSearch, type CatalogProduct } from "@/lib/products/catalog";

type Props = {
  categories: any[];
  units: any[];
  subcategories: any[];
  existing: CatalogProduct[];
  defaultCategoryId: string;
  categoryName: (id: string) => string;
  onAdded: () => void;
};

export default function ProductForm({ categories, units, subcategories, existing, defaultCategoryId, categoryName, onAdded }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", description: "",
    categoryId: categories.some((c) => c.id === defaultCategoryId) ? defaultCategoryId : categories[0]?.id ?? "",
    unitId: units[0]?.id ?? "", subcategoryId: "", price: "", imageUrl: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);

  const availableSubcategories = subcategories.filter((s) => s.category_id === form.categoryId);
  const normalizedName = normalizeSearch(form.name);
  const duplicate = normalizedName.length > 0 && existing.some(
    (p) => p.category_id === form.categoryId && normalizeSearch(p.name) === normalizedName
  );

  async function handleSubmit() {
    if (!form.name.trim() || !form.categoryId || !form.unitId) { setError("يرجى إكمال البيانات الأساسية"); return; }
    setLoading(true);
    setError(null);
    setAdded(null);

    const price = Number(form.price) || 0;
    const { error: insertError } = await supabase.from("products").insert({
      name: form.name.trim(), description: form.description.trim() || null, category_id: form.categoryId,
      sale_unit_id: form.unitId, subcategory_id: form.subcategoryId || null,
      last_known_price: price, image_url: form.imageUrl || null
    });
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }

    const subcategory = availableSubcategories.find((s) => s.id === form.subcategoryId)?.name;
    const unit = units.find((u) => u.id === form.unitId)?.name;
    setAdded(
      `تمت إضافة «${form.name.trim()}» — ${categoryName(form.categoryId)}${subcategory ? ` › ${subcategory}` : ""} — ${price} ج.م / ${unit}${form.imageUrl ? "" : " — بدون صورة"}`
    );
    setForm({ ...form, name: "", description: "", price: "", imageUrl: "", subcategoryId: "" });
    setUploadKey((key) => key + 1);
    onAdded();
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">إضافة منتج جديد</h2>

      {added && <p className="alert alert-success text-sm">{added}</p>}

      <input className="input" placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      {duplicate && (
        <p className="alert alert-warning text-sm">يوجد منتج بنفس الاسم في هذا التصنيف بالفعل. تأكد إنك مش بتكرر منتج موجود.</p>
      )}
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
      <input type="number" dir="ltr" min={0} step="0.01" className="input" placeholder="آخر سعر معروف (تقريبي)" value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })} />
      <ImageUploadField key={uploadKey} purpose="catalog" onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? "جارٍ الإضافة..." : "إضافة المنتج"}</button>
    </div>
  );
}
