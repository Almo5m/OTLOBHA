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

// (تصميم شبكة التصنيفات بقى موحّد الحجم بدل Bento متفاوت — شكله كان
// مزدحم بصريًا حسب ملاحظتك، فالشبكة الجديدة أبسط وأنظف)

const HOW_IT_WORKS = [
  { icon: "cart" as const, title: "اختار احتياجاتك", desc: "من الكتالوج أو حتى منتج مش موجود عندنا" },
  { icon: "agent" as const, title: "نشتريها فعليًا", desc: "مندوبنا بيشتري المنتجات بنفسه بالسعر الحقيقي" },
  { icon: "delivery" as const, title: "توصلك لباب البيت", desc: "ادفع أونلاين أو عند الاستلام، وتابع طلبك أول بأول" }
];

export default async function HomePage() {
  const supabase = await createServerSupabase();

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

  const { data: settingsRows } = await supabase
    .from("platform_settings")
    .select("key,value")
    .in("key", [
      "service_area_label", "platform_mode", "maintenance_message",
      "home_banner_image_url", "home_hero_image_url",
      "categories_visible", "free_order_card_image_url"
    ]);

  const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));
  const categoriesVisible = settings.categories_visible !== false;

  const { data: categories } = categoriesVisible
    ? await supabase
        .from("categories")
        .select("id,name,image_url,description")
        .eq("is_active", true)
        .order("sort_order")
    : { data: null };

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

        {/* Hero: تعريف الخدمة — أول حاجة يشوفها أي زائر جديد. ارتفاع البانر
            بقى ثابت (مش تابع لمقاس الصورة المرفوعة) عشان يفضل موحّد ومتحكم
            فيه مهما كانت الصورة اللي هترفعها بعدين */}
        {settings.home_banner_image_url && (
          <div className="mb-8 h-32 w-full overflow-hidden rounded-lg sm:h-40 md:h-48">
            <Image
              src={settings.home_banner_image_url}
              alt="المنيب جو"
              width={1200}
              height={300}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <section className="mb-10 flex flex-col items-center gap-6 text-center md:flex-row-reverse md:text-right">
          {settings.home_hero_image_url ? (
            <Image
              src={settings.home_hero_image_url}
              alt=""
              width={220}
              height={220}
              className="h-40 w-40 shrink-0 rounded-2xl object-cover md:h-52 md:w-52"
            />
          ) : (
            <HeroIllustration className="h-40 w-auto shrink-0 md:h-52" />
          )}
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

        {/* كيف تعمل الخدمة — تصميم "خطوات مرقّمة" أبسط وأوضح: دايرة كبيرة
            بالرقم بس (بدل تراكب أيقونة + شارة رقم صغيرة كان شكلها مزدحم) */}
        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="card flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-inkContrast">
                <span className="numeric">{i + 1}</span>
              </div>
              <Icon name={step.icon} size={18} className="mt-1 text-textSecondary" />
              <p className="mt-1 font-bold">{step.title}</p>
              <p className="text-sm text-textSecondary">{step.desc}</p>
            </div>
          ))}
        </section>

        <PerksAlert />

        {categoriesVisible ? (
          <>
            <h2 className="mb-4 text-xl font-bold">تصفّح التصنيفات</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(categories ?? []).map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.id}`}
                  className="card card-interactive flex flex-col overflow-hidden !p-0"
                >
                  <div className="aspect-[4/3] w-full bg-surfaceElevated">
                    {c.image_url ? (
                      <Image src={c.image_url} alt={c.name} width={300} height={225} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <IconBadge name={iconForCategory(c.name)} size="lg" />
                      </div>
                    )}
                  </div>
                  <span className="p-3 text-center font-medium">{c.name}</span>
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
          </>
        ) : (
          // مرحلة مؤقتة: الأقسام متخفّية لحد ما يتجمع كتالوج كافي — العميل
          // بيكتب طلبه بالكامل بنفسه، وده الكارت الرئيسي اللي بيوديه هناك
          <Link
            href="/cart"
            className="card card-interactive flex flex-col items-center overflow-hidden !p-0 text-center"
          >
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-surfaceElevated sm:aspect-[21/9]">
              {settings.free_order_card_image_url ? (
                <Image
                  src={settings.free_order_card_image_url}
                  alt=""
                  width={800}
                  height={340}
                  className="h-full w-full object-cover"
                />
              ) : (
                <IconBadge name="cart" size="lg" />
              )}
            </div>
            <div className="p-6">
              <p className="text-lg font-bold">مش لاقي اللي محتاجه؟</p>
              <p className="mt-1 text-sm text-textSecondary">اكتب طلبك بنفسك — أي منتج وأي كمية، وإحنا هنجيبهولك</p>
              <span className="btn-primary mt-4 inline-flex">
                <Icon name="plus" size={16} /> ابدأ طلبك دلوقتي
              </span>
            </div>
          </Link>
        )}
      </main>
      <Footer />
    </>
  );
}
