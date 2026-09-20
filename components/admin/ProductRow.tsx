"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/Badge";
import InlinePrice from "./InlinePrice";
import ProductEditor from "./ProductEditor";
import ProductThumb from "./ProductThumb";
import type { CatalogCategory, CatalogProduct, CatalogSubcategory, CatalogUnit, Issue } from "@/lib/products/catalog";

const ISSUE_LABEL: Record<Issue, string> = {
  "no-image": "بدون صورة",
  "no-subcategory": "بدون تصنيف فرعي",
  "zero-price": "سعر صفر"
};

type Props = {
  product: CatalogProduct;
  issues: Issue[];
  unitName: string;
  isNew: boolean;
  isOpen: boolean;
  categories: CatalogCategory[];
  subcategories: CatalogSubcategory[];
  units: CatalogUnit[];
  onToggle: () => void;
};

export default function ProductRow({ product, issues, unitName, isNew, isOpen, categories, subcategories, units, onToggle }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [togglingStatus, setTogglingStatus] = useState(false);
  const isActive = product.status === "active";

  async function handleToggleStatus() {
    setTogglingStatus(true);
    await supabase.from("products").update({ status: isActive ? "inactive" : "active" }).eq("id", product.id);
    setTogglingStatus(false);
    router.refresh();
  }

  return (
    <div className={`card overflow-hidden !p-0 ${isNew ? "active-ring" : ""}`}>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:flex-nowrap ${isActive ? "" : "opacity-60"}`}>
        <button onClick={onToggle} className="shrink-0" title="عرض وتعديل بيانات المنتج">
          <ProductThumb src={product.image_url} />
        </button>

        <div className="min-w-0 flex-1 basis-40">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{product.name}</span>
            {isNew && <Badge variant="accent">جديد</Badge>}
          </p>
          <p className="truncate text-xs text-textSecondary">
            {unitName}
            {product.description ? ` — ${product.description}` : ""}
          </p>
          {issues.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1">
              {issues.map((issue) => <Badge key={issue} variant="warning">{ISSUE_LABEL[issue]}</Badge>)}
            </p>
          )}
        </div>

        <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <InlinePrice productId={product.id} price={Number(product.last_known_price)} />
          <button onClick={handleToggleStatus} disabled={togglingStatus} title={isActive ? "اضغط لإيقاف المنتج" : "اضغط لإعادة التفعيل"}>
            <Badge variant={isActive ? "success" : "neutral"}>{isActive ? "نشط" : "موقوف"}</Badge>
          </button>
          <button onClick={onToggle} aria-expanded={isOpen} className="text-xs text-accent underline">
            {isOpen ? "إغلاق" : "تعديل"}
          </button>
        </div>
      </div>

      {isOpen && (
        <ProductEditor product={product} categories={categories} subcategories={subcategories} units={units} onClose={onToggle} />
      )}
    </div>
  );
}
