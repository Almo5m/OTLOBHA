import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import StaffManager from "@/components/StaffManager";
import Icon from "@/components/Icon";

export default async function UsersManagementPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: users } = await supabase
    .from("users")
    .select("id,full_name,phone,role,status")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-2 flex items-center gap-2 text-xl font-bold">
          <Icon name="account" size={20} className="text-textSecondary" /> الفريق والصلاحيات
        </h1>
        <p className="mb-4 text-sm text-textSecondary">
          مفيش تسجيل مفتوح — الحسابات بتتعمل من هنا بس. كل الأدوار الثلاثة (مندوب / أدمن / سوبر أدمن) بتستلم الطلبات وتكملها.
        </p>
        <StaffManager staff={(users ?? []) as any} currentUserId={user!.id} />
      </main>
    </>
  );
}
