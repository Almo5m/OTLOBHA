import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://almoneib-go.vercel.app";

// كل صفحات لوحات التحكم والحسابات والـauth مالهاش أي قيمة تظهر في نتائج
// البحث، وظهورها ممكن كمان يسرّب هيكل المشروع لغير المصرح لهم — ممنوعة
// بالكامل من الفهرسة
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", "/agent", "/super", "/api",
        "/login", "/register", "/reset-password", "/blocked",
        "/checkout", "/cart", "/orders", "/profile", "/debts", "/complaints", "/search"
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
