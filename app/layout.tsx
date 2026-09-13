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

export const metadata: Metadata = {
  title: "اطلبها — نطلبها ونوصّلها لحد باب البيت",
  description: "خدمة توصيل محلية داخل المنيب",
  manifest: "/manifest.json"
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
