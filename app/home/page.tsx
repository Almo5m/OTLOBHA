import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import IconBadge from "@/components/IconBadge";
import PopularProductsSection from "@/components/PopularProductsSection";
import Footer from "@/components/Footer";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import PerksAlert from "@/components/PerksAlert";
import HeroIllustration from "@/components/illustrations/HeroIllustration";

function iconForCategory(name: string): Parameters<typeof Icon>[0]["name"] {
  if (name.includes("سوق")) return "market";
  if (name.includes("تنظيف")) return "cleaning";
  if (name.includes("طب")) return "medical";
  if (name.includes("خضر")) return "vegetables";
  return "products";
}

// نمط Bento بأحجام متنوعة بدل شبكة موحّدة — بيتكرر كل 4 عناصر
const BENTO_SPANS = [
  "col-span-2 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1"
];

const HOW_IT_WORKS = [
  { icon: "cart" as const, title: "اختار احتياجاتك", desc: "من الكتالوج أو حتى منتج مش موجود عندنا" },
  { icon: "agent" as const, title: "نشتريها فعليًا", desc: "مندوبنا بيشتري المنتجات بنفسه بالسعر الحقيقي" },
  { icon: "delivery" as const, title: "توصلك لباب البيت", desc: "ادفع أونلاين أو عند الاستلام، وتابع طلبك أول بأول" }
];

export default async function HomePage() {
  const supabase = createServerSupabase();

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://almoneib-go.vercel.app";
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "المنيب جو",
    description: "خدمة توصيل محلية داخل المنيب — سوق، صيدلية، خضار وأكتر، بيشتريها مندوبنا فعليًا ويوصّلها لباب البيت.",
    url: SITE_URL,
    image: `${SITE_URL}/og-image.png`,
    areaServed: { "@type": "Place", name: "المنيب، الجيزة، مصر" },
    priceRange: "$$"
  };

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,image_url,description")
    .eq("is_active", true)
    .order("sort_order");

  const { data: settingsRows } = await supabase
    .from("platform_settings")
    .select("key,value")
    .in("key", ["service_area_label", "platform_mode", "maintenance_message", "home_banner_image_url"]);

  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <CustomerNav />
      <OnboardingTutorial />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 md:max-w-4xl md:pb-10 lg:max-w-5xl">
        {settings.platform_mode === "maintenance" && (
          <div className="alert alert-warning mb-6">{settings.maintenance_message}</div>
        )}

        {/* Hero: تعريف الخدمة — أول حاجة يشوفها أي زائر جديد */}
        {settings.home_banner_image_url && (
          <div className="mb-8 overflow-hidden rounded-lg">
            <Image
              src={settings.home_banner_image_url}
              alt="المنيب جو"
              width={800}
              height={300}
              className="h-auto w-full object-cover"
            />
          </div>
        )}
        <section className="mb-10 flex flex-col items-center gap-6 text-center md:flex-row-reverse md:text-right">
          <HeroIllustration className="h-40 w-auto shrink-0 md:h-52" />
          <div>
            <span className="badge badge-neutral mb-3 inline-flex">
              <Icon name="location" size={13} />
              <span className="numeric">{settings.service_area_label ?? "المنيب – مصر"}</span>
            </span>
            <h1 className="text-2xl font-bold leading-snug sm:text-3xl">
              اطلب اللي محتاجه،<br className="hidden sm:block" /> إحنا نجيبهولك لباب البيت
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-textSecondary sm:text-base">
              من السوق للصيدلية للخضار — تختار، ومندوبنا يشتريها فعليًا ويوصّلها لباب بيتك.
            </p>
          </div>
        </section>

        {/* كيف تعمل الخدمة — 3 خطوات، كل واحدة في كارت مستقل بشارة أكبر
            بلون البراند بدل صف نص عادي، عشان تبقى أوضح وأقوى بصريًا */}
        <section className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="card flex items-center gap-4 sm:flex-col sm:text-center">
              <div className="relative shrink-0">
                <IconBadge name={step.icon} tone="brand" size="lg" />
                <span className="numeric absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="font-bold">{step.title}</p>
                <p className="mt-1 text-sm text-textSecondary">{step.desc}</p>
              </div>
            </div>
          ))}
        </section>

        <PerksAlert />

        <h2 className="mb-4 text-xl font-bold">تصفّح التصنيفات</h2>
        <div className="grid grid-cols-2 auto-rows-[88px] gap-3 sm:grid-cols-4 sm:auto-rows-[110px]">
          {(categories ?? []).map((c, i) => {
            const span = BENTO_SPANS[i % 4];
            const isBig = span.includes("col-span-2") && span.includes("row-span-2");
            return (
              <Link
                key={c.id}
                href={`/categories/${c.id}`}
                className={`card card-interactive relative flex flex-col items-center justify-center gap-2 overflow-hidden p-3 text-center ${span}`}
              >
                {c.image_url ? (
                  <>
                    <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="relative z-10 mt-auto font-bold text-white">{c.name}</span>
                  </>
                ) : (
                  <>
                    <IconBadge name={iconForCategory(c.name)} size={isBig ? "lg" : "md"} />
                    <span className="font-medium">{c.name}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <Link href="/cart" className="btn-secondary w-full">
            <Icon name="plus" size={16} />
            عايز تطلب منتج مش موجود؟ أضِفه يدويًا من السلة
          </Link>
        </div>

        <PopularProductsSection />
      </main>
      <Footer />
    </>
  );
}
