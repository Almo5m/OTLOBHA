"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import IconBadge from "@/components/IconBadge";
import ProductForm from "@/components/ProductForm";

type Request = {
  id: string;
  manual_name: string;
  manual_image_url: string | null;
  quantity: number | null;
  target_price: number | null;
  customer_comment: string | null;
  created_at: string;
  manual_category_id: string | null;
  categories: { name: string } | null;
  sale_units: { name: string } | null;
  orders: { order_number: string; users: { full_name: string; phone: string } | null } | null;
};

export default function ProductRequestsList({
  requests, categories, units, subcategories, existingProducts
}: {
  requests: Request[];
  categories: any[];
  units: any[];
  subcategories: any[];
  existingProducts: any[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [selected, setSelected] = useState<Request | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreated(productId: string) {
    if (!selected) return;
    await supabase.rpc("mark_product_request_converted", { p_order_item_id: selected.id, p_product_id: productId });
    setSelected(null);
    router.refresh();
  }

  async function handleDismiss(request: Request) {
    if (!confirm("تجاهل الطلب ده من غير ما تضيفه كمنتج؟ (بيانات الطلب الأصلي مش هتتأثر، بس هيختفي من القائمة دي)")) return;
    setBusyId(request.id);
    await supabase.rpc("dismiss_product_request", { p_order_item_id: request.id });
    setBusyId(null);
    router.refresh();
  }

  return (
    <>
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
        <Icon name="plus" size={20} className="text-textSecondary" /> طلبات منتجات جديدة
      </h1>
      <p className="mb-5 text-sm text-textSecondary">
        منتجات طلبها عملاء ومش موجودة في الكتالوج حاليًا. حوّلها لمنتج حقيقي بضغطة واحدة، والبيانات هتتعبى تلقائيًا.
      </p>

      {requests.length === 0 ? (
        <div className="card text-center text-sm text-textSecondary">مفيش طلبات منتجات جديدة حاليًا 🎉</div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="card flex flex-wrap items-center gap-3">
              {r.manual_image_url ? (
                <Image src={r.manual_image_url} alt={r.manual_name} width={52} height={52} className="h-13 w-13 shrink-0 rounded-lg object-cover" />
              ) : (
                <IconBadge name="products" tone="neutral" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.manual_name}</p>
                <p className="numeric text-xs text-textSecondary">
                  {r.target_price ? `بميزانية ${r.target_price} ج.م` : `${r.quantity} ${r.sale_units?.name}`} — {r.categories?.name ?? "بدون تصنيف مقترح"}
                  {r.customer_comment ? ` — «${r.customer_comment}»` : ""}
                </p>
                <p className="text-xs text-textSecondary">
                  طلب {r.orders?.order_number} — {r.orders?.users?.full_name} ({r.orders?.users?.phone})
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setSelected(r)} className="btn-primary text-sm">إضافة كمنتج</button>
                <button onClick={() => handleDismiss(r)} disabled={busyId === r.id} className="text-xs text-textSecondary underline">تجاهل</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
          <button aria-label="إغلاق" onClick={() => setSelected(null)} className="absolute inset-0 bg-ink/50" />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-bg p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">تحويل الطلب لمنتج في الكتالوج</h2>
              <button onClick={() => setSelected(null)} aria-label="إغلاق" className="flex h-8 w-8 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated">
                <Icon name="close" size={18} />
              </button>
            </div>
            <ProductForm
              key={selected.id}
              categories={categories}
              units={units}
              subcategories={subcategories}
              existing={existingProducts}
              defaultCategoryId={selected.manual_category_id ?? categories[0]?.id ?? ""}
              categoryName={(id) => categories.find((c) => c.id === id)?.name ?? ""}
              initial={{
                name: selected.manual_name,
                description: selected.customer_comment ?? "",
                categoryId: selected.manual_category_id ?? undefined,
                imageUrl: selected.manual_image_url ?? undefined
              }}
              onCreated={handleCreated}
              onAdded={() => {}}
            />
          </div>
        </div>
      )}
    </>
  );
}
