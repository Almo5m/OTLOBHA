"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";
import IconBadge from "./IconBadge";
import AddToCartButton from "./AddToCartButton";

type PopularProduct = {
  product_id: string;
  name: string;
  image_url: string | null;
  last_known_price: number;
  unit_id: string;
  unit_name: string;
  slug: string;
};

export default function PopularProductsSection() {
  const [products, setProducts] = useState<PopularProduct[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_popular_products", { p_limit: 8 }).then(({ data }) => setProducts(data ?? []));
  }, []);

  if (products !== null && products.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <Icon name="rating" size={19} className="text-accent" /> منتجات ناس كتير طلبتها
      </h2>
      <p className="mb-4 -mt-2 text-xs text-textSecondary">ممكن تكون ناسي حاجة منهم 👀</p>

      <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {products === null
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-44 w-36 shrink-0 rounded-lg" />)
          : products.map((p) => (
              <div key={p.product_id} className="card flex w-36 shrink-0 flex-col items-center gap-2 text-center">
                <Link href={`/product/${encodeURIComponent(p.slug)}`}>
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} width={56} height={56} className="rounded-md object-cover" />
                  ) : (
                    <IconBadge name="products" />
                  )}
                </Link>
                <Link href={`/product/${encodeURIComponent(p.slug)}`} className="line-clamp-2 text-sm font-medium">{p.name}</Link>
                <p className="numeric text-xs text-textSecondary">{p.last_known_price} ج.م / {p.unit_name}</p>
                <AddToCartButton
                  type="catalog"
                  productId={p.product_id}
                  productName={p.name}
                  imageUrl={p.image_url}
                  displayedPrice={p.last_known_price}
                  unitId={p.unit_id}
                  unitName={p.unit_name}
                />
              </div>
            ))}
      </div>
    </section>
  );
}
