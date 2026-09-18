/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }]
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
