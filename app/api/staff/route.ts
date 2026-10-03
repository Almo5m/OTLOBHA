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

// بنلاقي مستخدم Auth بالبريد (للحسابات اليتيمة: موجودة في Auth ومالهاش صف في users)
async function findAuthUserByEmail(admin: ReturnType<typeof createAdminSupabase>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 1000) return null;
  }
  return null;
}

// إنشاء حساب إداري جديد (مندوب / أدمن / سوبر أدمن) — السوبر أدمن فقط
//
// مهم: صف public.users بيتكتب هنا صراحةً (مش بنعتمد على trigger) لأن Supabase
// بيطبّق app_metadata بعد إدخال المستخدم، فالـ trigger كان بيشوف الدور فاضي
// وميعملش صف — فالحساب كان بيتعمل في Auth بس ومبيظهرش في قائمة المستخدمين.
export async function POST(request: Request) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const invalid = validateNewStaff(body ?? {});
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const phone = normalizePhone(body.phone);
  const fullName = String(body.full_name).trim();
  const email = staffEmail(phone);
  const admin = createAdminSupabase();

  // الرقم مستخدم لموظف تاني بالفعل؟
  const { data: existingProfile } = await admin.from("users").select("id").eq("phone", phone).maybeSingle();
  if (existingProfile) return NextResponse.json({ error: "الرقم ده مسجّل لموظف بالفعل" }, { status: 409 });

  let userId: string;
  let created = true;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    app_metadata: { role: body.role, phone, full_name: fullName }
  });

  if (error) {
    if (!/already|registered|exists/i.test(error.message)) {
      return NextResponse.json({ error: "تعذّر إنشاء الحساب" }, { status: 500 });
    }
    // حساب يتيم من محاولة سابقة: نصلّحه بدل ما نقول "مسجّل" ونسيبه عالق
    const orphan = await findAuthUserByEmail(admin, email);
    if (!orphan) return NextResponse.json({ error: "الرقم ده مسجّل قبل كده" }, { status: 409 });
    const { error: fixErr } = await admin.auth.admin.updateUserById(orphan.id, {
      password: body.password,
      app_metadata: { role: body.role, phone, full_name: fullName }
    });
    if (fixErr) return NextResponse.json({ error: "تعذّر إصلاح الحساب القديم" }, { status: 500 });
    userId = orphan.id;
    created = false;
  } else {
    userId = data.user.id;
  }

  const { error: profileErr } = await admin.from("users").upsert(
    { id: userId, phone, full_name: fullName, role: body.role, status: "active" },
    { onConflict: "id" }
  );
  if (profileErr) {
    if (created) await admin.auth.admin.deleteUser(userId).catch(() => {});   // نرجّع كل حاجة زي ما كانت
    return NextResponse.json({ error: "تعذّر حفظ بيانات الموظف" }, { status: 500 });
  }

  return NextResponse.json({ id: userId, repaired: !created });
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
