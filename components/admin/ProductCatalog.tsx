"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import ProductForm from "@/components/ProductForm";
import ProductRow from "./ProductRow";
import {
  buildRows, countBy, createLookup, filterProducts, isRecentlyAdded, noSubcategoryKey, NO_SUBCATEGORY,
  productIssues, sortProducts,
  type CatalogCategory, type CatalogFilters, type CatalogProduct, type CatalogSubcategory, type CatalogUnit,
  type Issue, type SortMode, type StatusFilter
} from "@/lib/products/catalog";

const PAGE_SIZE = 60;

const ISSUE_CHIPS: { issue: Issue; label: string }[] = [
  { issue: "no-image", label: "بدون صورة" },
  { issue: "no-subcategory", label: "بدون تصنيف فرعي" },
  { issue: "zero-price", label: "سعر صفر" }
];

const INITIAL_FILTERS: CatalogFilters = { query: "", categoryId: "", subcategoryId: "", status: "all", issue: "" };

function chipClass(active: boolean) {
  return `shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
    active ? "bg-brand text-inkContrast font-medium" : "border border-borderc text-textSecondary hover:bg-surfaceElevated"
  }`;
}

type Props = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  subcategories: CatalogSubcategory[];
  units: CatalogUnit[];
};

export default function ProductCatalog({ products, categories, subcategories, units }: Props) {
  const [filters, setFilters] = useState<CatalogFilters>(INITIAL_FILTERS);
  const [sort, setSort] = useState<SortMode>("grouped");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => { setNow(Date.now()); }, [products]);

  const lookup = useMemo(() => createLookup(categories, subcategories, units), [categories, subcategories, units]);
  const counts = useMemo(() => countBy(products, lookup), [products, lookup]);
  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);

  const matching = useMemo(
    () => sortProducts(filterProducts(products, filters, lookup), sort, lookup),
    [products, filters, sort, lookup]
  );
  const visible = matching.slice(0, limit);
  const rows = useMemo(() => buildRows(visible, matching, sort, lookup), [visible, matching, sort, lookup]);

  const categorySubcategories = subcategories
    .filter((s) => s.category_id === filters.categoryId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ar"));
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS);

  function updateFilters(changes: Partial<CatalogFilters>) {
    setFilters((current) => ({ ...current, ...changes }));
    setLimit(PAGE_SIZE);
    setOpenId(null);
  }

  function handleAdded() {
    setFilters(INITIAL_FILTERS);
    setSort("newest");
    setLimit(PAGE_SIZE);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Icon name="products" size={20} className="text-textSecondary" /> المنتجات
          </h1>
          <span className="numeric text-sm text-textSecondary">
            {counts.total} منتج{counts.inactive > 0 ? ` — ${counts.inactive} موقوف` : ""}
          </span>
        </div>
        <button onClick={() => setShowForm((value) => !value)} className={showForm ? "btn-secondary text-sm" : "btn-primary text-sm"}>
          {showForm ? "إغلاق النموذج" : "+ منتج جديد"}
        </button>
      </div>

      {showForm && (
        <ProductForm
          categories={activeCategories} units={units} subcategories={subcategories}
          existing={products} defaultCategoryId={filters.categoryId}
          categoryName={(id) => lookup.categoryById.get(id)?.name ?? ""}
          onAdded={handleAdded}
        />
      )}

      <div className="card space-y-3 !p-3">
        <div className="relative">
          <Icon name="search" size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            className="input !ps-10" placeholder="ابحث باسم المنتج أو وصفه..." value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
          />
        </div>

        <div className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
          <button onClick={() => updateFilters({ categoryId: "", subcategoryId: "" })} className={chipClass(!filters.categoryId)}>
            كل التصنيفات <span className="numeric opacity-70">({counts.total})</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => updateFilters({ categoryId: category.id, subcategoryId: "" })}
              className={chipClass(filters.categoryId === category.id)}
            >
              {category.name} <span className="numeric opacity-70">({counts.byCategory.get(category.id) ?? 0})</span>
            </button>
          ))}
        </div>

        {categorySubcategories.length > 0 && (
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
            <button onClick={() => updateFilters({ subcategoryId: "" })} className={chipClass(!filters.subcategoryId)}>كل الفرعية</button>
            {categorySubcategories.map((sub) => (
              <button key={sub.id} onClick={() => updateFilters({ subcategoryId: sub.id })} className={chipClass(filters.subcategoryId === sub.id)}>
                {sub.name} <span className="numeric opacity-70">({counts.bySubcategory.get(sub.id) ?? 0})</span>
              </button>
            ))}
            <button onClick={() => updateFilters({ subcategoryId: NO_SUBCATEGORY })} className={chipClass(filters.subcategoryId === NO_SUBCATEGORY)}>
              بدون تصنيف فرعي <span className="numeric opacity-70">({counts.bySubcategory.get(noSubcategoryKey(filters.categoryId)) ?? 0})</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <select
            className="input !w-auto !py-1.5 text-sm" value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value as StatusFilter })}
          >
            <option value="all">كل الحالات</option>
            <option value="active">النشطة فقط</option>
            <option value="inactive">الموقوفة فقط</option>
          </select>

          <select className="input !w-auto !py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
            <option value="grouped">مرتّبة حسب التصنيف</option>
            <option value="newest">الأحدث إضافةً أولًا</option>
          </select>

          <span className="hidden h-5 w-px bg-borderc sm:block" />

          {ISSUE_CHIPS.map(({ issue, label }) => (
            <button
              key={issue}
              onClick={() => updateFilters({ issue: filters.issue === issue ? "" : issue })}
              className={`${chipClass(filters.issue === issue)} !py-1 !text-xs`}
              title="بيانات ناقصة تحتاج مراجعة"
            >
              {label} <span className="numeric opacity-70">({counts.issues[issue]})</span>
            </button>
          ))}

          {hasActiveFilters && (
            <button onClick={() => updateFilters(INITIAL_FILTERS)} className="ms-auto text-xs text-accent underline">مسح الفلاتر</button>
          )}
        </div>
      </div>

      <p className="numeric text-xs text-textSecondary">
        {hasActiveFilters ? `${matching.length} نتيجة من ${counts.total}` : `عرض ${Math.min(limit, matching.length)} من ${matching.length}`}
      </p>

      {matching.length === 0 ? (
        <div className="card text-center text-sm text-textSecondary">
          {counts.total === 0 ? "لا توجد منتجات بعد. اضغط «منتج جديد» لإضافة أول منتج." : "لا توجد منتجات تطابق البحث أو الفلاتر الحالية."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => {
            if (row.kind === "category") {
              return (
                <h2 key={row.key} className="flex items-center gap-2 border-b border-line pb-1.5 pt-6 text-base font-bold first:pt-0">
                  {row.name} <span className="numeric text-sm font-normal text-textSecondary">({row.count})</span>
                </h2>
              );
            }
            if (row.kind === "subcategory") {
              return (
                <h3 key={row.key} className="flex items-center gap-2 pb-0.5 pt-3 text-xs font-bold text-textSecondary">
                  {row.name} <span className="numeric font-normal opacity-70">({row.count})</span>
                </h3>
              );
            }
            const { product } = row;
            return (
              <ProductRow
                key={row.key}
                product={product}
                issues={productIssues(product, lookup)}
                unitName={lookup.unitById.get(product.sale_unit_id)?.name ?? ""}
                isNew={now !== null && isRecentlyAdded(product, now)}
                isOpen={openId === product.id}
                categories={categories}
                subcategories={subcategories}
                units={units}
                onToggle={() => setOpenId((current) => (current === product.id ? null : product.id))}
              />
            );
          })}

          {matching.length > limit && (
            <button onClick={() => setLimit((current) => current + PAGE_SIZE)} className="btn-secondary mt-3 w-full text-sm">
              عرض المزيد ({Math.min(PAGE_SIZE, matching.length - limit)} من {matching.length - limit} متبقي)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
