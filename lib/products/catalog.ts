export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
  subcategory_id: string | null;
  sale_unit_id: string;
  last_known_price: number;
  status: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type CatalogCategory = { id: string; name: string; is_active: boolean; sort_order: number };
export type CatalogSubcategory = { id: string; name: string; category_id: string; sort_order: number };
export type CatalogUnit = { id: string; name: string };

export type Issue = "no-image" | "no-subcategory" | "zero-price";
export type StatusFilter = "all" | "active" | "inactive";
export type SortMode = "grouped" | "newest";

export const NO_SUBCATEGORY = "none";

export function noSubcategoryKey(categoryId: string) {
  return `${NO_SUBCATEGORY}:${categoryId}`;
}

export type CatalogFilters = {
  query: string;
  categoryId: string;
  subcategoryId: string;
  status: StatusFilter;
  issue: Issue | "";
};

export type CatalogLookup = {
  categoryById: Map<string, CatalogCategory>;
  subcategoryById: Map<string, CatalogSubcategory>;
  unitById: Map<string, CatalogUnit>;
  categoriesWithSubcategories: Set<string>;
};

export type CatalogRow =
  | { kind: "category"; key: string; name: string; count: number }
  | { kind: "subcategory"; key: string; name: string; count: number }
  | { kind: "product"; key: string; product: CatalogProduct };

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g;
const collator = new Intl.Collator("ar", { numeric: true, sensitivity: "base" });

export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, " ")
    .trim();
}

export function createLookup(
  categories: CatalogCategory[],
  subcategories: CatalogSubcategory[],
  units: CatalogUnit[]
): CatalogLookup {
  return {
    categoryById: new Map(categories.map((category) => [category.id, category])),
    subcategoryById: new Map(subcategories.map((subcategory) => [subcategory.id, subcategory])),
    unitById: new Map(units.map((unit) => [unit.id, unit])),
    categoriesWithSubcategories: new Set(subcategories.map((subcategory) => subcategory.category_id))
  };
}

export function productIssues(product: CatalogProduct, lookup: CatalogLookup): Issue[] {
  const issues: Issue[] = [];
  if (!product.image_url) issues.push("no-image");
  if (!product.subcategory_id && lookup.categoriesWithSubcategories.has(product.category_id)) issues.push("no-subcategory");
  if (!(Number(product.last_known_price) > 0)) issues.push("zero-price");
  return issues;
}

export function filterProducts(products: CatalogProduct[], filters: CatalogFilters, lookup: CatalogLookup) {
  const tokens = normalizeSearch(filters.query).split(" ").filter(Boolean);

  return products.filter((product) => {
    if (filters.categoryId && product.category_id !== filters.categoryId) return false;
    if (filters.subcategoryId === NO_SUBCATEGORY && product.subcategory_id) return false;
    if (filters.subcategoryId && filters.subcategoryId !== NO_SUBCATEGORY && product.subcategory_id !== filters.subcategoryId) return false;
    if (filters.status !== "all" && product.status !== filters.status) return false;
    if (filters.issue && !productIssues(product, lookup).includes(filters.issue)) return false;

    if (tokens.length > 0) {
      const haystack = normalizeSearch(`${product.name} ${product.description ?? ""}`);
      if (!tokens.every((token) => haystack.includes(token))) return false;
    }
    return true;
  });
}

function orderOf(item: { sort_order: number; name: string } | undefined) {
  return item ? item.sort_order : Number.MAX_SAFE_INTEGER;
}

export function sortProducts(products: CatalogProduct[], mode: SortMode, lookup: CatalogLookup) {
  const sorted = [...products];

  if (mode === "newest") {
    return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return sorted.sort((a, b) => {
    const categoryA = lookup.categoryById.get(a.category_id);
    const categoryB = lookup.categoryById.get(b.category_id);
    if (a.category_id !== b.category_id) {
      return orderOf(categoryA) - orderOf(categoryB) || collator.compare(categoryA?.name ?? "", categoryB?.name ?? "");
    }

    const subA = a.subcategory_id ? lookup.subcategoryById.get(a.subcategory_id) : undefined;
    const subB = b.subcategory_id ? lookup.subcategoryById.get(b.subcategory_id) : undefined;
    if (a.subcategory_id !== b.subcategory_id && (subA || subB)) {
      if (!subA) return 1;
      if (!subB) return -1;
      return orderOf(subA) - orderOf(subB) || collator.compare(subA.name, subB.name);
    }

    return collator.compare(a.name, b.name);
  });
}

export function buildRows(
  visible: CatalogProduct[],
  allMatching: CatalogProduct[],
  mode: SortMode,
  lookup: CatalogLookup
): CatalogRow[] {
  if (mode === "newest") {
    return visible.map((product) => ({ kind: "product", key: product.id, product }));
  }

  const categoryCounts = new Map<string, number>();
  const subcategoryCounts = new Map<string, number>();
  for (const product of allMatching) {
    categoryCounts.set(product.category_id, (categoryCounts.get(product.category_id) ?? 0) + 1);
    const subKey = `${product.category_id}:${product.subcategory_id ?? NO_SUBCATEGORY}`;
    subcategoryCounts.set(subKey, (subcategoryCounts.get(subKey) ?? 0) + 1);
  }

  const rows: CatalogRow[] = [];
  let lastCategory: string | null = null;
  let lastSubcategory: string | null | undefined;

  for (const product of visible) {
    if (product.category_id !== lastCategory) {
      rows.push({
        kind: "category",
        key: `category:${product.category_id}`,
        name: lookup.categoryById.get(product.category_id)?.name ?? "بدون تصنيف",
        count: categoryCounts.get(product.category_id) ?? 0
      });
      lastCategory = product.category_id;
      lastSubcategory = undefined;
    }

    if (lookup.categoriesWithSubcategories.has(product.category_id) && product.subcategory_id !== lastSubcategory) {
      const subKey = `${product.category_id}:${product.subcategory_id ?? NO_SUBCATEGORY}`;
      rows.push({
        kind: "subcategory",
        key: `subcategory:${subKey}`,
        name: product.subcategory_id ? lookup.subcategoryById.get(product.subcategory_id)?.name ?? "" : "بدون تصنيف فرعي",
        count: subcategoryCounts.get(subKey) ?? 0
      });
      lastSubcategory = product.subcategory_id;
    }

    rows.push({ kind: "product", key: product.id, product });
  }

  return rows;
}

export function countBy(products: CatalogProduct[], lookup: CatalogLookup) {
  const byCategory = new Map<string, number>();
  const bySubcategory = new Map<string, number>();
  const issues: Record<Issue, number> = { "no-image": 0, "no-subcategory": 0, "zero-price": 0 };
  let inactive = 0;

  for (const product of products) {
    byCategory.set(product.category_id, (byCategory.get(product.category_id) ?? 0) + 1);
    const subKey = product.subcategory_id ?? noSubcategoryKey(product.category_id);
    bySubcategory.set(subKey, (bySubcategory.get(subKey) ?? 0) + 1);
    if (product.status !== "active") inactive += 1;
    for (const issue of productIssues(product, lookup)) issues[issue] += 1;
  }

  return { total: products.length, inactive, byCategory, bySubcategory, issues };
}

export function isRecentlyAdded(product: CatalogProduct, now: number, windowMinutes = 15) {
  return now - new Date(product.created_at).getTime() < windowMinutes * 60_000;
}
