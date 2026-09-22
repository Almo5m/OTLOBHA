import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import ProductRequestsList from "@/components/admin/ProductRequestsList";

export default async function AdminProductRequestsPage() {
  const supabase = await createServerSupabase();

  const [{ data: requests }, { data: categories }, { data: units }, { data: subcategories }, { data: existingProducts }] =
    await Promise.all([
      supabase
        .from("order_items")
        .select(`
          id, manual_name, manual_image_url, quantity, target_price, customer_comment, created_at, manual_category_id,
          categories:manual_category_id (name),
          sale_units:unit_id (name),
          orders:order_id (order_number, users!orders_customer_id_fkey (full_name, phone))
        `)
        .eq("item_type", "manual")
        .is("converted_product_id", null)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name,is_active,sort_order").order("sort_order"),
      supabase.from("sale_units").select("id,name").order("name"),
      supabase.from("product_subcategories").select("id,name,category_id,sort_order"),
      supabase.from("products").select("id,name,description,image_url,category_id,subcategory_id,sale_unit_id,last_known_price,status,slug")
    ]);

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["order_items", "products"]} channelName="admin-product-requests" />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <ProductRequestsList
          requests={(requests as any) ?? []}
          categories={categories ?? []}
          units={units ?? []}
          subcategories={subcategories ?? []}
          existingProducts={existingProducts ?? []}
        />
      </main>
    </>
  );
}
