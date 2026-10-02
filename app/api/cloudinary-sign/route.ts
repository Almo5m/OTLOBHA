import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  buildUploadParams, isUploadPurpose, roleCanUpload, signUploadParams, type UploadRole
} from "@/lib/cloudinary/sign";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const purpose = body?.purpose;
  if (!isUploadPurpose(purpose)) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  // الزائر (من غير حساب) مسموحله يرفع صور الطلب بس، والإداري حسب دوره
  let role: UploadRole = "guest";
  if (user) {
    const { data: profile } = await supabase.from("users").select("role,status").eq("id", user.id).maybeSingle();
    if (profile && profile.status === "active") role = profile.role as UploadRole;
  }
  if (!roleCanUpload(purpose, role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { data: withinLimit } = await supabase.rpc("consume_rate_limit", { p_action: "cloudinary_sign" });
  if (withinLimit !== true) {
    return NextResponse.json({ error: "محاولات كثيرة، حاول مرة أخرى بعد قليل" }, { status: 429 });
  }

  const params = buildUploadParams(purpose, Math.round(Date.now() / 1000));

  return NextResponse.json({
    ...params,
    signature: signUploadParams(params, process.env.CLOUDINARY_API_SECRET!),
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  });
}
