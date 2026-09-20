import Link from "next/link";
import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import AddToCartButton from "@/components/AddToCartButton";
import IconBadge from "@/components/IconBadge";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";

const NO_SUBCATEGORY_KEY = "__none__";

export default async function CategoryProductsPage({
  params, searchParams
}: { params: Promise<{ id: string }>; searchParams: Promise<{ sub?: string }> }) {
  const { id } = await params;
  const { sub } = await searchParams;
  const supabase = await createServerSupabase();

  const { data: category } = await supabase.from("categories").select("name").eq("id", id).single();
  const { data: subcategories } = await supabase
    .from("product_subcategories")
    .select("id,name")
    .eq("category_id", id)
    .order("sort_order");

  let query = supabase
    .from("products")
    .select("id,name,image_url,description,last_known_price,sale_unit_id,slug,subcategory_id,sale_units(name)")
    .eq("category_id", id)
    .eq("status", "active")
    .order("name");

  if (sub) query = query.eq("subcategory_id", sub);

  const { data: products } = await query;
  const list = products ?? [];

  // من غير فلتر محدد، بنجمّع الـ200 صنف تحت عناوين التصنيفات الفرعية بدل
  // ما تبقى قائمة واحدة طويلة — أسهل بكتير للعميل إنه يلاقي اللي محتاجه
  const groups: { id: string; name: string; items: typeof list }[] = [];
  if (!sub) {
    const bySubcategory = new Map<string, typeof list>();
    for (const p of list) {
      const key = p.subcategory_id ?? NO_SUBCATEGORY_KEY;
      if (!bySubcategory.has(key)) bySubcategory.set(key, []);
      bySubcategory.get(key)!.push(p);
    }
    for (const s of subcategories ?? []) {
      if (bySubcategory.has(s.id)) groups.push({ id: s.id, name: s.name, items: bySubcategory.get(s.id)! });
    }
    if (bySubcategory.has(NO_SUBCATEGORY_KEY)) {
      groups.push({ id: NO_SUBCATEGORY_KEY, name: "منتجات أخرى", items: bySubcategory.get(NO_SUBCATEGORY_KEY)! });
    }
  } else {
    groups.push({ id: sub, name: "", items: list });
  }

  return (
    <>
      <CustomerNav />
      <RealtimeRefresher tables={["products"]} channelName={`category-${id}`} />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6 lg:max-w-5xl">
        <h1 className="mb-1 text-xl font-bold">{category?.name}</h1>
        <p className="mb-4 text-xs text-textSecondary">
          الأسعار الظاهرة تقريبية وقابلة للتغيير — السعر النهائي هو سعر الشراء الفعلي
        </p>

        {/* فلترة حسب التصنيف الفرعي — تظهر بس لو القسم فيه تصنيفات فرعية فعلاً */}
        {(subcategories ?? []).length > 0 && (
          <div className="scrollbar-none mb-4 flex gap-1.5 overflow-x-auto py-1">
            <Link
              href={`/categories/${id}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                !sub ? "bg-brand text-inkContrast font-medium" : "border border-borderc text-textSecondary hover:bg-surfaceElevated"
              }`}
            >
              الكل
            </Link>
            {(subcategories ?? []).map((s) => (
              <Link
                key={s.id}
                href={`/categories/${id}?sub=${s.id}`}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  sub === s.id ? "bg-brand text-inkContrast font-medium" : "border border-borderc text-textSecondary hover:bg-surfaceElevated"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        {list.length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا توجد منتجات متاحة هنا حاليًا" />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.id}>
                {group.name && (
                  <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-textSecondary">
                    {group.name}
                    <span className="numeric font-normal text-textSecondary/70">({group.items.length})</span>
                  </h2>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((p: any) => (
                    <div key={p.id} className="card flex flex-col overflow-hidden !p-0 animate-fadeIn">
                      <Link href={`/product/${encodeURIComponent(p.slug)}`} className="block aspect-square w-full bg-surfaceElevated">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} width={200} height={200} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <IconBadge name="products" size="lg" />
                          </div>
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                        <Link href={`/product/${encodeURIComponent(p.slug)}`} className="line-clamp-2 min-h-[2.5em] text-sm font-medium hover:text-accent">
                          {p.name}
                        </Link>
                        <p className="numeric text-xs text-textSecondary">
                          {p.last_known_price} ج.م / {p.sale_units?.name}
                        </p>
                        <div className="mt-auto pt-1">
                          <AddToCartButton
                            className="w-full"
                            type="catalog"
                            productId={p.id}
                            productName={p.name}
                            imageUrl={p.image_url}
                            displayedPrice={p.last_known_price}
                            unitId={p.sale_unit_id}
                            unitName={p.sale_units?.name}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
