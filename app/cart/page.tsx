"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CustomerNav from "@/components/CustomerNav";
import Icon from "@/components/Icon";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, addItem } = useCartStore();
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
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
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="cart" size={20} className="text-accent" /> السلة</h1>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.key} className="card flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{item.type === "manual" ? item.manualName : "منتج من الكتالوج"}</p>
                <p className="text-xs text-textSecondary">{item.unitName} {item.comment ? `— ${item.comment}` : ""}</p>
              </div>
              <input
                type="number" min={0.5} step="0.5" value={item.quantity}
                onChange={(e) => updateQuantity(item.key, Number(e.target.value))}
                className="w-16 rounded-sm border border-line px-2 py-1.5 text-center text-sm"
              />
              <button onClick={() => removeItem(item.key)} className="text-sm text-error">حذف</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-textSecondary">السلة فارغة حاليًا.</p>}
        </div>

        <div className="card mt-6">
          <h2 className="mb-3 font-medium">طلب منتج غير موجود في الكتالوج</h2>
          <div className="space-y-3">
            <input className="input" placeholder="اسم المنتج" value={manualForm.name}
              onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} />
            <div className="flex gap-2">
              <input type="number" min={0.5} step="0.5" className="input" placeholder="الكمية"
                value={manualForm.quantity}
                onChange={(e) => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} />
              <select className="input" value={manualForm.unitId}
                onChange={(e) => setManualForm({ ...manualForm, unitId: e.target.value })}>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <input className="input" placeholder="تعليق اختياري" value={manualForm.comment}
              onChange={(e) => setManualForm({ ...manualForm, comment: e.target.value })} />
            <button onClick={handleAddManual} className="btn-secondary w-full">إضافة للسلة</button>
          </div>
        </div>

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
    </>
  );
}
