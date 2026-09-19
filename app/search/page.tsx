"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import CustomerNav from "@/components/CustomerNav";
import AddToCartButton from "@/components/AddToCartButton";
import Icon from "@/components/Icon";
import IconBadge from "@/components/IconBadge";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/client";

type Result = {
  id: string; name: string; image_url: string | null; description: string | null;
  last_known_price: number; category_id: string; category_name: string;
  sale_unit_id: string; unit_name: string; slug: string;
};

export default function SearchPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    supabase.rpc("search_products", { p_query: q.trim() }).then(({ data }) => {
      setResults(data ?? []);
      setLoading(false);
    });
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <div className="relative mb-5">
          <Icon name="search" size={17} className="pointer-events-none absolute inset-y-0 right-3.5 my-auto text-textSecondary" />
          <input
            autoFocus
            className="input pr-10"
            placeholder="ابحث عن منتج... (زي: أرز، شامبو، بيض)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading && <p className="text-center text-sm text-textSecondary">بندوّر...</p>}

        {!loading && searched && results.length === 0 && (
          <EmptyState
            illustration={<IconBadge name="search" size="lg" tone="neutral" />}
            title="مفيش نتائج"
            description="جرّب كلمة تانية أو تأكد من الإملاء"
          />
        )}

        {!loading && !searched && (
          <p className="py-8 text-center text-sm text-textSecondary">اكتب اسم المنتج اللي بتدور عليه</p>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2">
            {results.map((p) => (
              <div key={p.id} className="card flex items-center gap-3">
                {p.image_url ? (
                  <Image src={p.image_url} alt={p.name} width={52} height={52} className="h-13 w-13 shrink-0 rounded-lg object-cover" />
                ) : (
                  <IconBadge name="products" size="lg" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-textSecondary">{p.category_name} · {p.last_known_price} ج.م تقريبًا / {p.unit_name}</p>
                </div>
                <AddToCartButton
                  type="catalog"
                  productId={p.id}
                  productName={p.name}
                  imageUrl={p.image_url}
                  displayedPrice={p.last_known_price}
                  unitId={p.sale_unit_id}
                  unitName={p.unit_name}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
