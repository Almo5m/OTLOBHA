import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isStaffRoleValue, normalizePhone, staffEmail, validateNewStaff } from "@/lib/auth/staff-validation";

async function requireSuperAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("role,status").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active" || profile.role !== "super_admin") return null;
  return user.id;
}

// إنشاء حساب إداري جديد (مندوب / أدمن / سوبر أدمن) — السوبر أدمن فقط
export async function POST(request: Request) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const invalid = validateNewStaff(body ?? {});
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const phone = normalizePhone(body.phone);
  const fullName = String(body.full_name).trim();
  const admin = createAdminSupabase();

  // الدور والرقم في app_metadata (محدش يقدر يكتب فيها غير service_role) — الـ trigger بيقرا منها
  const { data, error } = await admin.auth.admin.createUser({
    email: staffEmail(phone),
    password: body.password,
    email_confirm: true,
    app_metadata: { role: body.role, phone, full_name: fullName }
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return NextResponse.json({ error: exists ? "الرقم ده مسجّل قبل كده" : "تعذّر إنشاء الحساب" }, { status: exists ? 409 : 500 });
  }
  return NextResponse.json({ id: data.user.id });
}

// تعديل حساب: كلمة مرور / دور / حالة — السوبر أدمن فقط
export async function PATCH(request: Request) {
  const callerId = await requireSuperAdmin();
  if (!callerId) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const userId = body?.user_id;
  if (typeof userId !== "string") return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  const admin = createAdminSupabase();

  switch (body.action) {
    case "set_password": {
      if (typeof body.password !== "string" || body.password.length < 8) {
        return NextResponse.json({ error: "كلمة المرور لازم تكون 8 أحرف على الأقل" }, { status: 400 });
      }
      const { error } = await admin.auth.admin.updateUserById(userId, { password: body.password });
      if (error) return NextResponse.json({ error: "تعذّر تغيير كلمة المرور" }, { status: 500 });
      await admin.auth.admin.signOut(userId, "global").catch(() => {});
      return NextResponse.json({ ok: true });
    }
    case "set_role": {
      if (!isStaffRoleValue(body.role)) return NextResponse.json({ error: "الدور غير صحيح" }, { status: 400 });
      if (userId === callerId) return NextResponse.json({ error: "مينفعش تغيّر دورك أنت" }, { status: 400 });
      const { error } = await admin.from("users").update({ role: body.role }).eq("id", userId);
      if (error) return NextResponse.json({ error: "تعذّر تغيير الدور" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    case "set_status": {
      if (!["active", "blocked"].includes(body.status)) return NextResponse.json({ error: "الحالة غير صحيحة" }, { status: 400 });
      if (userId === callerId) return NextResponse.json({ error: "مينفعش توقف حسابك أنت" }, { status: 400 });
      const { error } = await admin.from("users").update({ status: body.status }).eq("id", userId);
      if (error) return NextResponse.json({ error: "تعذّر تغيير الحالة" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }
}
