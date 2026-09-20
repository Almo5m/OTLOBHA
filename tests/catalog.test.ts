import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRows, countBy, createLookup, filterProducts, isRecentlyAdded, noSubcategoryKey,
  normalizeSearch, productIssues, sortProducts,
  type CatalogFilters, type CatalogProduct
} from "@/lib/products/catalog";

const categories = [
  { id: "c-veg", name: "خضار", is_active: true, sort_order: 2 },
  { id: "c-market", name: "سوبر ماركت", is_active: true, sort_order: 1 },
  { id: "c-med", name: "صيدلية", is_active: true, sort_order: 3 }
];
const subcategories = [
  { id: "s-dairy", name: "ألبان", category_id: "c-market", sort_order: 2 },
  { id: "s-oil", name: "زيوت", category_id: "c-market", sort_order: 1 }
];
const units = [{ id: "u-kg", name: "كيلو" }];
const lookup = createLookup(categories, subcategories, units);

let counter = 0;
function product(overrides: Partial<CatalogProduct>): CatalogProduct {
  counter += 1;
  return {
    id: `p${counter}`, name: `منتج ${counter}`, description: null, image_url: "https://res.cloudinary.com/x/image/upload/a.jpg",
    category_id: "c-market", subcategory_id: null, sale_unit_id: "u-kg", last_known_price: 10, status: "active",
    slug: `p-${counter}`, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z", ...overrides
  };
}

const NO_FILTERS: CatalogFilters = { query: "", categoryId: "", subcategoryId: "", status: "all", issue: "" };

test("normalizeSearch unifies Arabic letter variants, diacritics and digits", () => {
  assert.equal(normalizeSearch("  أَحمد   "), "احمد");
  assert.equal(normalizeSearch("إبراهيم"), normalizeSearch("ابراهيم"));
  assert.equal(normalizeSearch("مدرسة"), normalizeSearch("مدرسه"));
  assert.equal(normalizeSearch("علي"), normalizeSearch("على"));
  assert.equal(normalizeSearch("زيت ١٢٣"), "زيت 123");
  assert.equal(normalizeSearch("Coca COLA"), "coca cola");
});

test("search matches name or description, ignoring letter variants, all words required", () => {
  const items = [
    product({ name: "زيت عباد الشمس", description: "١ لتر" }),
    product({ name: "أرز مصري" }),
    product({ name: "لبن", description: "زبادي طبيعي" })
  ];
  const names = (query: string) => filterProducts(items, { ...NO_FILTERS, query }, lookup).map((p) => p.name);
  assert.deepEqual(names("ارز"), ["أرز مصري"]);
  assert.deepEqual(names("زيت لتر"), ["زيت عباد الشمس"]);
  assert.deepEqual(names("طبيعي"), ["لبن"]);
  assert.deepEqual(names("زيت أرز"), []);
  assert.equal(names("").length, 3);
});

test("category, subcategory and status filters combine", () => {
  const items = [
    product({ category_id: "c-market", subcategory_id: "s-oil" }),
    product({ category_id: "c-market", subcategory_id: "s-dairy", status: "inactive" }),
    product({ category_id: "c-market", subcategory_id: null }),
    product({ category_id: "c-veg" })
  ];
  const count = (filters: Partial<CatalogFilters>) => filterProducts(items, { ...NO_FILTERS, ...filters }, lookup).length;
  assert.equal(count({ categoryId: "c-market" }), 3);
  assert.equal(count({ categoryId: "c-market", subcategoryId: "s-oil" }), 1);
  assert.equal(count({ categoryId: "c-market", subcategoryId: "none" }), 1);
  assert.equal(count({ status: "inactive" }), 1);
  assert.equal(count({ categoryId: "c-market", status: "active" }), 2);
  assert.equal(count({ categoryId: "c-veg", subcategoryId: "s-oil" }), 0);
});

test("data-quality issues are detected only where they make sense", () => {
  assert.deepEqual(productIssues(product({ image_url: null, subcategory_id: "s-oil" }), lookup), ["no-image"]);
  assert.deepEqual(productIssues(product({ last_known_price: 0, subcategory_id: "s-oil" }), lookup), ["zero-price"]);
  assert.deepEqual(productIssues(product({ category_id: "c-market", subcategory_id: null }), lookup), ["no-subcategory"]);
  assert.deepEqual(productIssues(product({ category_id: "c-veg", subcategory_id: null }), lookup), []);
  assert.deepEqual(productIssues(product({ subcategory_id: "s-oil" }), lookup), []);
});

test("issue filter returns only products with that issue", () => {
  const items = [product({ image_url: null }), product({}), product({ last_known_price: 0, subcategory_id: "s-oil" })];
  assert.equal(filterProducts(items, { ...NO_FILTERS, issue: "no-image" }, lookup).length, 1);
  assert.equal(filterProducts(items, { ...NO_FILTERS, issue: "zero-price" }, lookup).length, 1);
  assert.equal(filterProducts(items, { ...NO_FILTERS, issue: "no-subcategory" }, lookup).length, 2);
});

test("grouped sort follows category order, then subcategory order, then name", () => {
  const items = [
    product({ name: "ب", category_id: "c-veg" }),
    product({ name: "لبن", category_id: "c-market", subcategory_id: "s-dairy" }),
    product({ name: "زيت ذرة", category_id: "c-market", subcategory_id: "s-oil" }),
    product({ name: "بدون فرعي", category_id: "c-market", subcategory_id: null }),
    product({ name: "أ", category_id: "c-veg" }),
    product({ name: "زيت زيتون", category_id: "c-market", subcategory_id: "s-oil" })
  ];
  const sorted = sortProducts(items, "grouped", lookup).map((p) => p.name);
  assert.deepEqual(sorted, ["زيت ذرة", "زيت زيتون", "لبن", "بدون فرعي", "أ", "ب"]);
});

test("newest sort puts the latest product first", () => {
  const items = [
    product({ name: "قديم", created_at: "2026-08-01T00:00:00Z" }),
    product({ name: "جديد", created_at: "2026-09-19T00:00:00Z" }),
    product({ name: "وسط", created_at: "2026-09-01T00:00:00Z" })
  ];
  assert.deepEqual(sortProducts(items, "newest", lookup).map((p) => p.name), ["جديد", "وسط", "قديم"]);
});

test("sorting does not mutate its input", () => {
  const items = [product({ name: "ب" }), product({ name: "أ" })];
  const snapshot = items.map((p) => p.name);
  sortProducts(items, "grouped", lookup);
  assert.deepEqual(items.map((p) => p.name), snapshot);
});

test("buildRows inserts category and subcategory headers with full-match counts", () => {
  const items = sortProducts([
    product({ name: "زيت", category_id: "c-market", subcategory_id: "s-oil" }),
    product({ name: "لبن", category_id: "c-market", subcategory_id: "s-dairy" }),
    product({ name: "جبن", category_id: "c-market", subcategory_id: "s-dairy" }),
    product({ name: "طماطم", category_id: "c-veg" })
  ], "grouped", lookup);

  const rows = buildRows(items.slice(0, 2), items, "grouped", lookup);
  assert.deepEqual(rows.map((row) => row.kind), ["category", "subcategory", "product", "subcategory", "product"]);
  const [category, firstSub, , secondSub] = rows;
  assert.equal(category.kind === "category" && category.count, 3);
  assert.equal(firstSub.kind === "subcategory" && firstSub.name, "زيوت");
  assert.equal(secondSub.kind === "subcategory" && secondSub.count, 2);

  const all = buildRows(items, items, "grouped", lookup);
  assert.deepEqual(all.filter((row) => row.kind === "category").map((row) => row.kind === "category" && row.name), ["سوبر ماركت", "خضار"]);
  assert.equal(all.some((row) => row.kind === "subcategory" && row.key.includes("c-veg")), false);
});

test("buildRows in newest mode returns plain product rows", () => {
  const items = [product({}), product({})];
  const rows = buildRows(items, items, "newest", lookup);
  assert.deepEqual(rows.map((row) => row.kind), ["product", "product"]);
});

test("countBy totals per category, subcategory and issue", () => {
  const items = [
    product({ category_id: "c-market", subcategory_id: "s-oil" }),
    product({ category_id: "c-market", subcategory_id: null, image_url: null }),
    product({ category_id: "c-veg", status: "inactive", last_known_price: 0 })
  ];
  const counts = countBy(items, lookup);
  assert.equal(counts.total, 3);
  assert.equal(counts.inactive, 1);
  assert.equal(counts.byCategory.get("c-market"), 2);
  assert.equal(counts.bySubcategory.get("s-oil"), 1);
  assert.equal(counts.bySubcategory.get(noSubcategoryKey("c-market")), 1);
  assert.deepEqual(counts.issues, { "no-image": 1, "no-subcategory": 1, "zero-price": 1 });
});

test("isRecentlyAdded uses a time window", () => {
  const now = new Date("2026-09-20T12:00:00Z").getTime();
  assert.equal(isRecentlyAdded(product({ created_at: "2026-09-20T11:50:00Z" }), now), true);
  assert.equal(isRecentlyAdded(product({ created_at: "2026-09-20T11:00:00Z" }), now), false);
});
