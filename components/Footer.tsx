import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import Wordmark from "./Wordmark";

export default async function Footer() {
  const supabase = createServerSupabase();
  const { data: policies } = await supabase
    .from("policies")
    .select("type, version")
    .order("published_at", { ascending: false });

  const terms = policies?.find((p) => p.type === "terms");
  const privacy = policies?.find((p) => p.type === "privacy");

  return (
    <footer className="mt-12 border-t border-borderc bg-surfaceElevated pb-20 md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6"><Wordmark /></div>

        <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 font-medium">الخدمة</p>
            <ul className="space-y-1.5 text-textSecondary">
              <li><Link href="/home" className="hover:text-textPrimary">الرئيسية</Link></li>
              <li><Link href="/orders" className="hover:text-textPrimary">طلباتي</Link></li>
              <li><Link href="/complaints" className="hover:text-textPrimary">تقديم شكوى</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium">قانوني</p>
            <ul className="space-y-1.5 text-textSecondary">
              {terms && <li><Link href={`/legal/terms`} className="hover:text-textPrimary">الشروط والأحكام</Link></li>}
              {privacy && <li><Link href={`/legal/privacy`} className="hover:text-textPrimary">سياسة الخصوصية</Link></li>}
              {!terms && !privacy && <li className="text-textSecondary/60">لسه مفيش سياسات منشورة</li>}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium">منطقة الخدمة</p>
            <p className="text-textSecondary">المنيب – مصر</p>
          </div>
        </div>

        <div className="mt-8 border-t border-borderc pt-4 text-center text-xs text-textSecondary">
          © {new Date().getFullYear()} المنيب جو — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
