import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogProduct } from "@/lib/products/catalog";

const PAGE_SIZE = 1000;
const COLUMNS = "id,name,description,image_url,category_id,subcategory_id,sale_unit_id,last_known_price,status,slug,created_at,updated_at";

export async function fetchAllProducts(supabase: SupabaseClient) {
  const products: CatalogProduct[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select(COLUMNS)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { products, error: error.message };
    products.push(...(data as CatalogProduct[]));
    if (data.length < PAGE_SIZE) break;
  }

  return { products, error: null };
}
