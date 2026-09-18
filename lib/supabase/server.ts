import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// عميل يُستخدم داخل Server Components / Route Handlers فقط
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // مهم: بدون هذا، Next.js بيحط طلبات fetch جوه Server Components في
      // الـ Data Cache بتاعه (force-cache افتراضيًا)، فلو الدور اتغيّر في
      // الداتابيز (ترقية من /super/users مثلاً) الصفحة بتفضل شايفة الدور
      // القديم لحد ما الـ token يتغيّر (يعني logout/login). بيانات الصلاحيات
      // والدور لازم تكون طازة دايمًا، فمفيش أي كاش هنا خالص.
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" })
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // يحدث عند الاستدعاء من Server Component بدون إمكانية الكتابة — متوقع
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        }
      }
    }
  );
}
