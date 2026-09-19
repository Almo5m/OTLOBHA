import { createClient } from "@/lib/supabase/client";

/**
 * تسجيل جلسة دخول جديدة في user_sessions — بتتنادى مرة واحدة فور نجاح
 * تسجيل الدخول أو إنشاء الحساب، عشان صفحة "الجلسات النشطة" عند السوبر
 * أدمن تعرض بيانات حقيقية بدل ما تفضل فاضية دايمًا.
 */
export async function recordSession(userId: string) {
  const supabase = createClient();
  const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent : null;

  await supabase.from("user_sessions").insert({
    user_id: userId,
    device_info: deviceInfo
  });
}
