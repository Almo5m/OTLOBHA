import type { Metadata } from "next";
import { Almarai, Inter } from "next/font/google";
import "./globals.css";
import PushRegistrar from "@/components/PushRegistrar";
import ThemeScript from "@/components/theme/ThemeScript";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Almarai: خط عربي ناعم مستدير (Soft Rounded Arabic Sans) — الخط الأساسي للهوية
// ملحوظة: خط Almarai يدعم subset "arabic" فقط على Google Fonts (لا يوجد "latin")
const almarai = Almarai({ subsets: ["arabic"], weight: ["400", "700", "800"], variable: "--font-arabic" });
// Inter: للأرقام/النصوص اللاتينية — متناسق بصريًا مع Almarai بدون تعارض حاد
const inter = Inter({ subsets: ["latin"], variable: "--font-latin" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://almoneib-go.vercel.app";
const SITE_NAME = "المنيب جو";
const SITE_DESCRIPTION = "خدمة توصيل محلية داخل المنيب — اطلب من السوق أو الصيدلية أو الخضار، ومندوبنا يشتريها فعليًا ويوصّلها لباب بيتك.";

export const metadata: Metadata = {
  // metadataBase لازم يتظبط على الدومين الحقيقي بعد ربط الموقع بدومين (أو
  // رابط Vercel بتاعه) — من غيره روابط og:image ممكن تطلع بمسار غلط لما
  // تتشارك على واتساب/فيسبوك. غيّر NEXT_PUBLIC_SITE_URL في متغيرات البيئة.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — نطلب ونوصّل لحد باب البيت`,
    template: `%s — ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  openGraph: {
    title: `${SITE_NAME} — نطلب ونوصّل لحد باب البيت`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
    locale: "ar_EG",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — نطلب ونوصّل لحد باب البيت`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"]
  }
};

export const viewport = {
  themeColor: "#FBB51F"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${almarai.variable} ${inter.variable} font-sans bg-bg text-textPrimary antialiased`}>
        <ThemeProvider>
          <PushRegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
