import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import AddToCartButton from "@/components/AddToCartButton";
import IconBadge from "@/components/IconBadge";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";
import Image from "next/image";

export default async function CategoryProductsPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: category } = await supabase.from("categories").select("name").eq("id", params.id).single();

  const { data: products } = await supabase
    .from("products")
    .select("id,name,image_url,description,last_known_price,sale_unit_id,sale_units(name)")
    .eq("category_id", params.id)
    .eq("status", "active");

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6 lg:max-w-4xl">
        <h1 className="mb-1 text-xl font-bold">{category?.name}</h1>
        <p className="mb-4 text-xs text-textSecondary">
          الأسعار الظاهرة تقريبية وقابلة للتغيير — السعر النهائي هو سعر الشراء الفعلي
        </p>

        {(products ?? []).length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا توجد منتجات متاحة هنا حاليًا" />
        ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(products ?? []).map((p: any) => (
            <div key={p.id} className="card flex items-center gap-4 animate-fadeIn">
              {p.image_url ? (
                <Image src={p.image_url} alt={p.name} width={56} height={56} className="rounded-md object-cover" />
              ) : (
                <IconBadge name="products" size="lg" />
              )}
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="numeric text-sm text-textSecondary">
                  {p.last_known_price} ج.م تقريبًا / {p.sale_units?.name}
                </p>
              </div>
              <AddToCartButton
                type="catalog"
                productId={p.id}
                productName={p.name}
                imageUrl={p.image_url}
                displayedPrice={p.last_known_price}
                unitId={p.sale_unit_id}
                unitName={p.sale_units?.name}
              />
            </div>
          ))}
        </div>
        )}
      </main>
    </>
  );
}
