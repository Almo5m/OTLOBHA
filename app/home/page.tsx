import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import IconBadge from "@/components/IconBadge";
import PopularProductsSection from "@/components/PopularProductsSection";

function iconForCategory(name: string): Parameters<typeof Icon>[0]["name"] {
  if (name.includes("سوق")) return "market";
  if (name.includes("تنظيف")) return "cleaning";
  if (name.includes("طب")) return "medical";
  if (name.includes("خضر")) return "vegetables";
  return "products";
}

export default async function HomePage() {
  const supabase = createServerSupabase();

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,image_url,description")
    .eq("is_active", true)
    .order("sort_order");

  const { data: settingsRows } = await supabase
    .from("platform_settings")
    .select("key,value")
    .in("key", ["service_area_label", "platform_mode", "maintenance_message", "outside_working_hours_message"]);

  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-4xl md:pb-6 lg:max-w-5xl">
        <div className="alert alert-info mb-6 flex items-center gap-2">
          <Icon name="location" size={16} />
          منطقة الخدمة الحالية: <strong className="numeric">{settings.service_area_label ?? "المنيب – مصر"}</strong>
        </div>

        {settings.platform_mode === "maintenance" && (
          <div className="alert alert-warning mb-6">{settings.maintenance_message}</div>
        )}

        <h1 className="mb-4 text-xl font-bold">التصنيفات</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.id}`}
              className="card card-interactive flex flex-col items-center gap-2 text-center"
            >
              {c.image_url ? (
                <Image src={c.image_url} alt={c.name} width={64} height={64} className="rounded-md object-cover" />
              ) : (
                <IconBadge name={iconForCategory(c.name)} tone="accent" size="lg" />
              )}
              <span className="font-medium">{c.name}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/cart" className="btn-secondary w-full">
            <Icon name="plus" size={16} />
            عايز تطلب منتج مش موجود؟ أضِفه يدويًا من السلة
          </Link>
        </div>

        <PopularProductsSection />
      </main>
    </>
  );
}
