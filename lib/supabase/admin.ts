import "server-only";
import { createClient } from "@supabase/supabase-js";

// عميل بصلاحيات service_role — للسيرفر فقط (إنشاء حسابات الإداريين وتغيير كلمات المرور).
// ممنوع استيراده من أي Client Component.
export function createAdminSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
