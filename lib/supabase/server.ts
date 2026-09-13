import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// عميل يُستخدم داخل Server Components / Route Handlers فقط
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
