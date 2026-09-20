"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "@/components/ImageUploadField";
import ProductThumb from "./ProductThumb";
import type { CatalogCategory, CatalogProduct, CatalogSubcategory, CatalogUnit } from "@/lib/products/catalog";

type Props = {
  product: CatalogProduct;
  categories: CatalogCategory[];
  subcategories: CatalogSubcategory[];
  units: CatalogUnit[];
  onClose: () => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

export default function ProductEditor({ product, categories, subcategories, units, onClose }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? "",
    categoryId: product.category_id,
    subcategoryId: product.subcategory_id ?? "",
    unitId: product.sale_unit_id,
    price: String(product.last_known_price),
    status: product.status,
    imageUrl: product.image_url ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSubcategories = subcategories.filter((s) => s.category_id === form.categoryId);

  async function handleSave() {
    const price = Number(form.price);
    if (!form.name.trim()) { setError("اسم المنتج مطلوب"); return; }
    if (!Number.isFinite(price) || price < 0) { setError("السعر غير صالح"); return; }

    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from("products").update({
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.categoryId,
      subcategory_id: form.subcategoryId || null,
      sale_unit_id: form.unitId,
      last_known_price: price,
      status: form.status,
      image_url: form.imageUrl || null
    }).eq("id", product.id);
    setSaving(false);

    if (updateError) { setError(updateError.message); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="space-y-3 border-t border-line bg-surfaceElevated p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">اسم المنتج</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <label className="label">الوصف</label>
          <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div>
          <label className="label">التصنيف</label>
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: "" })}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? "" : " (غير نشط)"}</option>)}
          </select>
        </div>

        <div>
          <label className="label">التصنيف الفرعي</label>
          <select
            className="input" value={form.subcategoryId} disabled={availableSubcategories.length === 0}
            onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}
          >
            <option value="">{availableSubcategories.length === 0 ? "لا توجد تصنيفات فرعية" : "بدون تصنيف فرعي"}</option>
            {availableSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">وحدة البيع</label>
          <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">آخر سعر معروف (تقريبي)</label>
          <input type="number" dir="ltr" min={0} step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>

        <div>
          <label className="label">الحالة</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">نشط (يظهر للعملاء)</option>
            <option value="inactive">موقوف (مخفي عن العملاء)</option>
          </select>
        </div>

        <div>
          <span className="label">الصورة</span>
          <div className="flex items-center gap-3">
            <ProductThumb src={form.imageUrl || null} size={56} />
            {form.imageUrl && (
              <button onClick={() => setForm({ ...form, imageUrl: "" })} className="text-xs text-error underline">إزالة الصورة</button>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <ImageUploadField purpose="catalog" onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
        </div>
      </div>

      <p className="text-xs text-textSecondary">
        أُضيف: {formatDate(product.created_at)} — آخر تعديل: {formatDate(product.updated_at)} — الرابط: <span dir="ltr" className="numeric">{product.slug}</span>
      </p>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button>
        <button onClick={onClose} disabled={saving} className="btn-secondary">إلغاء</button>
      </div>
    </div>
  );
}
