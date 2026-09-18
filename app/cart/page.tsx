"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CustomerNav from "@/components/CustomerNav";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import IconBadge from "@/components/IconBadge";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, addItem } = useCartStore();
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", quantity: 1, unitId: "", comment: "" });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("sale_units").select("id,name").then(({ data }) => {
      setUnits(data ?? []);
      if (data && data.length) setManualForm((f) => ({ ...f, unitId: data[0].id }));
    });
  }, []);

  function handleAddManual() {
    if (!manualForm.name.trim() || !manualForm.unitId) return;
    const unit = units.find((u) => u.id === manualForm.unitId);
    addItem({
      key: crypto.randomUUID(),
      type: "manual",
      manualName: manualForm.name,
      quantity: manualForm.quantity,
      unitId: manualForm.unitId,
      unitName: unit?.name ?? "",
      comment: manualForm.comment
    });
    setManualForm({ ...manualForm, name: "", quantity: 1, comment: "" });
    setManualOpen(false);
  }

  const estimatedTotal = items.reduce(
    (sum, i) => sum + (i.displayedPrice ?? 0) * i.quantity,
    0
  );
  const hasManualItems = items.some((i) => i.type === "manual");

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="cart" size={20} className="text-textSecondary" /> السلة</h1>

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.key} className="card flex items-center gap-3">
                {item.type === "catalog" && item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName ?? ""} width={52} height={52} className="h-13 w-13 shrink-0 rounded-lg object-cover" />
                ) : (
                  <IconBadge name={item.type === "manual" ? "cart" : "products"} tone="neutral" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.type === "manual" ? item.manualName : item.productName ?? "منتج"}</p>
                  <p className="text-xs text-textSecondary">
                    {item.unitName} {item.comment ? `— ${item.comment}` : ""}
                  </p>
                  {typeof item.displayedPrice === "number" && (
                    <p className="numeric mt-0.5 text-sm font-medium text-textSecondary">
                      {item.displayedPrice} ج.م × {item.quantity} = {(item.displayedPrice * item.quantity).toFixed(2)} ج.م
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <input
                    type="number" dir="ltr" min={0.5} step="0.5" value={item.quantity}
                    onChange={(e) => updateQuantity(item.key, Number(e.target.value))}
                    className="w-16 rounded-sm border border-line px-2 py-1.5 text-center text-sm"
                  />
                  <button onClick={() => removeItem(item.key)} className="text-xs text-error">حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {items.length === 0 && (
          <EmptyState
            illustration={<IconBadge name="cart" size="lg" />}
            title="السلة فاضية دلوقتي"
            description="ارجع للتصنيفات واختار اللي محتاجه"
          />
        )}

        {/* طلب منتج مش موجود في الكتالوج — زرار بالعرض بيفتح نافذة بدل فورم ثابت في الصفحة */}
        <button onClick={() => setManualOpen(true)} className="btn-secondary mt-6 w-full">
          <Icon name="plus" size={16} /> طلب منتج مش موجود في الكتالوج
        </button>

        {items.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm text-textSecondary">
              الإجمالي التقريبي: {estimatedTotal.toFixed(2)} ج.م
              {hasManualItems && " (لا يشمل المنتجات اليدوية التي ليس لها سعر معروف مسبقًا)"}
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
              <h2 className="font-bold">طلب منتج مش موجود في الكتالوج</h2>
              <button onClick={() => setManualOpen(false)} aria-label="إغلاق" className="flex h-8 w-8 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input className="input" placeholder="اسم المنتج" value={manualForm.name}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} />
              <div className="flex gap-2">
                <input type="number" dir="ltr" min={0.5} step="0.5" className="input" placeholder="الكمية"
                  value={manualForm.quantity}
                  onChange={(e) => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} />
                <select className="input" value={manualForm.unitId}
                  onChange={(e) => setManualForm({ ...manualForm, unitId: e.target.value })}>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <input className="input" placeholder="تعليق اختياري" value={manualForm.comment}
                onChange={(e) => setManualForm({ ...manualForm, comment: e.target.value })} />
              <button onClick={handleAddManual} className="btn-primary w-full">إضافة للسلة</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
