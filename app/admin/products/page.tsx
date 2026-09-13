import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ProductForm from "@/components/ProductForm";
import ProductRowActions from "@/components/ProductRowActions";
import Icon from "@/components/Icon";
import IconBadge from "@/components/IconBadge";
import { Badge } from "@/components/Badge";
import Image from "next/image";

export default async function AdminProductsPage() {
  const supabase = createServerSupabase();
  const { data: products } = await supabase
    .from("products").select("*, categories(name), sale_units(name)").order("created_at", { ascending: false });
  const { data: categories } = await supabase.from("categories").select("id,name").eq("is_active", true);
  const { data: units } = await supabase.from("sale_units").select("id,name");

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6 lg:max-w-5xl">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="products" size={20} className="text-accent" /> المنتجات
        </h1>

        <ProductForm categories={categories ?? []} units={units ?? []} />

        <div className="mt-6 grid gap-2 lg:grid-cols-2">
          {(products ?? []).map((p: any) => (
            <div key={p.id} className="card flex items-center gap-3 text-sm animate-fadeIn">
              {p.image_url ? (
                <Image src={p.image_url} alt={p.name} width={44} height={44} className="rounded-md object-cover" />
              ) : (
                <IconBadge name="products" tone="accent" size="sm" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name}</p>
                <p className="numeric truncate text-textSecondary">{p.categories?.name} — {p.last_known_price} ج.م / {p.sale_units?.name}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant={p.status === "active" ? "success" : "neutral"}>
                  {p.status === "active" ? "نشط" : "موقوف"}
                </Badge>
                <ProductRowActions productId={p.id} status={p.status} price={p.last_known_price} />
              </div>
            </div>
          ))}
          {(products ?? []).length === 0 && <p className="text-sm text-textSecondary">لا توجد منتجات بعد.</p>}
        </div>
      </main>
    </>
  );
}
