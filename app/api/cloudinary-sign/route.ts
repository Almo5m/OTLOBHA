import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";

// يُستخدم هذا المسار فقط للحصول على توقيع آمن لرفع صورة مباشرة من
// المتصفح إلى Cloudinary، دون كشف CLOUDINARY_API_SECRET للعميل إطلاقًا.
// مفتوح لأي مستخدم مسجّل دخول (عملاء أيضًا) لأنه مطلوب الآن لرفع
// صورة إثبات التحويل عند الدفع الإلكتروني، وليس للإداريين فقط.
export async function POST() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");

  return NextResponse.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  });
}
