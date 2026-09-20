import type { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://almoneib-go.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabase();
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("is_active", true);
  const { data: products } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "active");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/home`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 }
  ];

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${SITE_URL}/categories/${c.id}`,
    changeFrequency: "daily",
    priority: 0.7
  }));

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${SITE_URL}/product/${encodeURIComponent(p.slug)}`,
    changeFrequency: "weekly",
    priority: 0.5
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
