import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import AddToCartButton from "@/components/AddToCartButton";
import IconBadge from "@/components/IconBadge";
import Icon from "@/components/Icon";

async function getProduct(slug: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("products")
    .select("id,name,image_url,description,last_known_price,status,category_id,sale_unit_id,categories(id,name),sale_units(name)")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "منتج غير موجود" };
  return {
    title: product.name,
    description: product.description || `${product.name} — اطلبه دلوقتي من المنيب جو ووصّله لباب بيتك.`,
    openGraph: product.image_url ? { images: [{ url: product.image_url }] } : undefined
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product || product.status !== "active") notFound();

  const category: any = product.categories;
  const unit: any = product.sale_units;

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-lg px-4 py-6">
        <Link href={`/categories/${product.category_id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-textSecondary">
          <Icon name="chevron" size={14} className="rotate-180" /> {category?.name}
        </Link>

        <div className="card">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} width={400} height={400} className="mb-4 h-56 w-full rounded-lg object-cover" />
          ) : (
            <div className="mb-4 flex h-56 items-center justify-center rounded-lg bg-surfaceElevated">
              <IconBadge name="products" size="lg" />
            </div>
          )}
          <h1 className="text-lg font-bold">{product.name}</h1>
          {product.description && <p className="mt-1 text-sm text-textSecondary">{product.description}</p>}
          <p className="numeric mt-2 text-base font-medium">{product.last_known_price} ج.م تقريبًا / {unit?.name}</p>

          <div className="mt-4">
            <AddToCartButton
              type="catalog"
              productId={product.id}
              productName={product.name}
              imageUrl={product.image_url}
              displayedPrice={product.last_known_price}
              unitId={product.sale_unit_id}
              unitName={unit?.name}
            />
          </div>
        </div>
      </main>
    </>
  );
}
