import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ProductCatalog from "@/components/admin/ProductCatalog";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import { fetchAllProducts } from "@/lib/products/fetch-all";

export default async function AdminProductsPage() {
  const supabase = await createServerSupabase();

  const [{ products, error }, { data: categories }, { data: units }, { data: subcategories }] = await Promise.all([
    fetchAllProducts(supabase),
    supabase.from("categories").select("id,name,is_active,sort_order").order("sort_order").order("name"),
    supabase.from("sale_units").select("id,name").order("name"),
    supabase.from("product_subcategories").select("id,name,category_id,sort_order")
  ]);

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["products"]} channelName="admin-products-list" />
      <main className="mx-auto max-w-4xl px-4 py-6 lg:max-w-5xl">
        {error && <p className="alert alert-error mb-4 text-sm">تعذّر تحميل كل المنتجات: {error}</p>}
        <ProductCatalog
          products={products}
          categories={categories ?? []}
          subcategories={subcategories ?? []}
          units={units ?? []}
        />
      </main>
    </>
  );
}
