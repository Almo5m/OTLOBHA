const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }]
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // بدون ده، Next.js بيخزّن نسخة الصفحة اللي اتزارت قبل كده (Router Cache)
    // لمدة 30 ثانية للصفحات الديناميكية، فلو رجعت لصفحة زرتها قبل كده بسرعة
    // (زي داشبورد المندوب بعد ما يفتح صفحة تانية ويرجع) ممكن تشوف نسخة قديمة
    // من البيانات (زي حالة "متاح/غير متاح") قبل آخر تحديث. تصفيرها هنا يجبر
    // إعادة الجلب من السيرفر في كل تنقل.
    staleTimes: {
      dynamic: 0
    }
  }
};
module.exports = nextConfig;
