import Link from "next/link";
import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import AddToCartButton from "@/components/AddToCartButton";
import IconBadge from "@/components/IconBadge";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";

export default async function CategoryProductsPage({
  params, searchParams
}: { params: { id: string }; searchParams: { sub?: string } }) {
  const supabase = createServerSupabase();

  const { data: category } = await supabase.from("categories").select("name").eq("id", params.id).single();
  const { data: subcategories } = await supabase
    .from("product_subcategories")
    .select("id,name")
    .eq("category_id", params.id)
    .order("sort_order");

  let query = supabase
    .from("products")
    .select("id,name,image_url,description,last_known_price,sale_unit_id,slug,subcategory_id,sale_units(name)")
    .eq("category_id", params.id)
    .eq("status", "active");

  if (searchParams.sub) query = query.eq("subcategory_id", searchParams.sub);

  const { data: products } = await query;

  return (
    <>
      <CustomerNav />
      <RealtimeRefresher tables={["products"]} channelName={`category-${params.id}`} />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6 lg:max-w-4xl">
        <h1 className="mb-1 text-xl font-bold">{category?.name}</h1>
        <p className="mb-4 text-xs text-textSecondary">
          الأسعار الظاهرة تقريبية وقابلة للتغيير — السعر النهائي هو سعر الشراء الفعلي
        </p>

        {/* فلترة حسب التصنيف الفرعي — تظهر بس لو القسم فيه تصنيفات فرعية فعلاً */}
        {(subcategories ?? []).length > 0 && (
          <div className="scrollbar-none mb-4 flex gap-1.5 overflow-x-auto">
            <Link
              href={`/categories/${params.id}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                !searchParams.sub ? "bg-brand text-inkContrast font-medium" : "border border-borderc text-textSecondary hover:bg-surfaceElevated"
              }`}
            >
              الكل
            </Link>
            {(subcategories ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/categories/${params.id}?sub=${s.id}`}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  searchParams.sub === s.id ? "bg-brand text-inkContrast font-medium" : "border border-borderc text-textSecondary hover:bg-surfaceElevated"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        {(products ?? []).length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا توجد منتجات متاحة هنا حاليًا" />
        ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(products ?? []).map((p: any) => (
            <div key={p.id} className="card flex items-center gap-4 animate-fadeIn">
              <Link href={`/product/${encodeURIComponent(p.slug)}`} className="shrink-0">
                {p.image_url ? (
                  <Image src={p.image_url} alt={p.name} width={56} height={56} className="rounded-md object-cover" />
                ) : (
                  <IconBadge name="products" size="lg" />
                )}
              </Link>
              <div className="flex-1">
                <Link href={`/product/${encodeURIComponent(p.slug)}`} className="font-medium hover:text-accent">{p.name}</Link>
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
