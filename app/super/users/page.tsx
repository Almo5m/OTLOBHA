import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import RoleSelect from "@/components/RoleSelect";
import Icon from "@/components/Icon";
import { Badge } from "@/components/Badge";

export default async function UsersManagementPage() {
  const supabase = createServerSupabase();
  const { data: users } = await supabase
    .from("users")
    .select("id,full_name,phone,role,status,created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-2 flex items-center gap-2 text-xl font-bold">
          <Icon name="account" size={20} className="text-textSecondary" /> إدارة المستخدمين والأدوار
        </h1>
        <p className="mb-4 text-sm text-textSecondary">
          لإنشاء حساب مندوب أو إداري جديد: اطلب منه التسجيل عاديًا من صفحة "إنشاء حساب"، ثم غيّر دوره من هنا.
        </p>
        <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surfaceElevated text-right">
              <tr>
                <th className="px-3 py-2">الاسم</th>
                <th className="px-3 py-2">الهاتف</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">الدور</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-borderc">
                  <td className="px-3 py-2">{u.full_name || "—"}</td>
                  <td className="numeric px-3 py-2">{u.phone}</td>
                  <td className="px-3 py-2"><Badge variant={u.status === "active" ? "success" : "error"}>{u.status === "active" ? "نشط" : "موقوف"}</Badge></td>
                  <td className="px-3 py-2"><RoleSelect userId={u.id} role={u.role} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
