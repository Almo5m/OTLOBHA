"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CustomerNav from "@/components/CustomerNav";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import IconBadge from "@/components/IconBadge";
import ImageUploadField from "@/components/ImageUploadField";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";

type PricingMode = "quantity" | "budget";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, addItem } = useCartStore();
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>("quantity");
  const [manualForm, setManualForm] = useState({
    name: "", quantity: 1, unitId: "", targetPrice: "", categoryId: "", comment: "", imageUrl: ""
  });
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("sale_units").select("id,name").then(({ data }) => {
      setUnits(data ?? []);
      if (data && data.length) setManualForm((f) => ({ ...f, unitId: data[0].id }));
    });
    supabase.from("categories").select("id,name").eq("is_active", true).order("sort_order").then(({ data }) => {
      setCategories(data ?? []);
      if (data && data.length) setManualForm((f) => ({ ...f, categoryId: data[0].id }));
    });
  }, []);

  function openManualModal() {
    setPricingMode("quantity");
    setManualOpen(true);
  }

  function handleAddManual() {
    if (!manualForm.name.trim()) return;
    if (pricingMode === "quantity" && !manualForm.unitId) return;
    if (pricingMode === "budget" && (!manualForm.targetPrice || Number(manualForm.targetPrice) <= 0)) return;

    const unit = units.find((u) => u.id === manualForm.unitId);
    addItem({
      key: crypto.randomUUID(),
      type: "manual",
      manualName: manualForm.name,
      manualCategoryId: manualForm.categoryId || undefined,
      imageUrl: manualForm.imageUrl || undefined,
      comment: manualForm.comment,
      ...(pricingMode === "budget"
        ? { targetPrice: Number(manualForm.targetPrice) }
        : { quantity: manualForm.quantity, unitId: manualForm.unitId, unitName: unit?.name ?? "" })
    });
    setManualForm({ ...manualForm, name: "", quantity: 1, targetPrice: "", comment: "", imageUrl: "" });
    setUploadKey((k) => k + 1);
    setManualOpen(false);
  }

  const estimatedTotal = items.reduce(
    (sum, i) => sum + (i.displayedPrice ?? 0) * (i.quantity ?? 0),
    0
  );
  const hasUnpricedItems = items.some((i) => i.type === "manual");

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="cart" size={20} className="text-textSecondary" /> طلبك</h1>

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.key} className="card flex items-center gap-3">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName ?? item.manualName ?? ""} width={52} height={52} className="h-13 w-13 shrink-0 rounded-lg object-cover" />
                ) : (
                  <IconBadge name={item.type === "manual" ? "cart" : "products"} tone="neutral" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.type === "manual" ? item.manualName : item.productName ?? "منتج"}</p>
                  <p className="text-xs text-textSecondary">
                    {item.targetPrice ? `بميزانية تقريبية ${item.targetPrice} ج.م` : item.unitName}
                    {item.comment ? ` — ${item.comment}` : ""}
                  </p>
                  {typeof item.displayedPrice === "number" && typeof item.quantity === "number" && (
                    <p className="numeric mt-0.5 text-sm font-medium text-textSecondary">
                      {item.displayedPrice} ج.م × {item.quantity} = {(item.displayedPrice * item.quantity).toFixed(2)} ج.م
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {typeof item.quantity === "number" && (
                    <input
                      type="number" dir="ltr" min={0.5} step="0.5" value={item.quantity}
                      onChange={(e) => updateQuantity(item.key, Number(e.target.value))}
                      className="w-16 rounded-sm border border-line px-2 py-1.5 text-center text-sm"
                    />
                  )}
                  <button onClick={() => removeItem(item.key)} className="text-xs text-error">حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {items.length === 0 && (
          <EmptyState
            illustration={<IconBadge name="cart" size="lg" />}
            title="طلبك فاضي دلوقتي"
            description="ضيف أول صنف عشان تبدأ"
          />
        )}

        <button onClick={openManualModal} className="btn-secondary mt-6 w-full">
          <Icon name="plus" size={16} /> إضافة صنف للطلب
        </button>

        {items.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm text-textSecondary">
              الإجمالي التقريبي: {estimatedTotal.toFixed(2)} ج.م
              {hasUnpricedItems && " (لا يشمل الأصناف اللي مالهاش سعر معروف مسبقًا)"}
            </p>
            <button onClick={() => router.push("/checkout")} className="btn-primary w-full">
              متابعة لإتمام الطلب
            </button>
          </div>
        )}
      </main>

      {manualOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button aria-label="إغلاق" onClick={() => setManualOpen(false)} className="absolute inset-0 bg-ink/50" />
          <div className="relative z-10 w-full max-w-sm rounded-t-2xl bg-bg p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">إضافة صنف للطلب</h2>
              <button onClick={() => setManualOpen(false)} aria-label="إغلاق" className="flex h-8 w-8 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="اسم الصنف" value={manualForm.name}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} />

              {/* اختيار طريقة التحديد: كمية+وحدة معروفة، أو ميزانية تقريبية بس */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button" onClick={() => setPricingMode("quantity")}
                  className={`rounded-lg border py-2 text-sm transition-colors ${pricingMode === "quantity" ? "border-brand bg-brand text-inkContrast font-medium" : "border-borderc text-textSecondary"}`}
                >
                  كمية محددة
                </button>
                <button
                  type="button" onClick={() => setPricingMode("budget")}
                  className={`rounded-lg border py-2 text-sm transition-colors ${pricingMode === "budget" ? "border-brand bg-brand text-inkContrast font-medium" : "border-borderc text-textSecondary"}`}
                >
                  بميزانية تقريبية
                </button>
              </div>

              {pricingMode === "quantity" ? (
                <div className="flex gap-2">
                  <input type="number" dir="ltr" min={0.5} step="0.5" className="input" placeholder="الكمية"
                    value={manualForm.quantity}
                    onChange={(e) => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} />
                  <select className="input" value={manualForm.unitId}
                    onChange={(e) => setManualForm({ ...manualForm, unitId: e.target.value })}>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <input type="number" dir="ltr" min={1} step="1" className="input" placeholder="مثال: 150"
                    value={manualForm.targetPrice}
                    onChange={(e) => setManualForm({ ...manualForm, targetPrice: e.target.value })} />
                  <p className="mt-1 text-xs text-textSecondary">هيشتريلك المندوب بالمبلغ ده تقريبًا حسب الكمية المتاحة</p>
                </div>
              )}

              <div>
                <label className="label">أقرب قسم له</label>
                <select className="input" value={manualForm.categoryId}
                  onChange={(e) => setManualForm({ ...manualForm, categoryId: e.target.value })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <input className="input" placeholder="تعليق اختياري (ماركة، مواصفات...)" value={manualForm.comment}
                onChange={(e) => setManualForm({ ...manualForm, comment: e.target.value })} />
              <div>
                <label className="label">صورة (اختياري، بتساعدنا نتعرف عليه بالظبط)</label>
                <ImageUploadField key={uploadKey} purpose="product-request" onUploaded={(url) => setManualForm({ ...manualForm, imageUrl: url })} />
              </div>
              <button onClick={handleAddManual} disabled={!manualForm.name.trim()} className="btn-primary w-full">إضافة للطلب</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
