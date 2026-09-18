import type { MetadataRoute } from "next";
import { createServerSupabase } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://almoneib-go.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabase();
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("is_active", true);

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

  return [...staticRoutes, ...categoryRoutes];
}
