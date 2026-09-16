import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import RevokeSessionButton from "@/components/RevokeSessionButton";

export default async function SessionsPage() {
  const supabase = createServerSupabase();
  const { data: sessions } = await supabase
    .from("user_sessions")
    .select("*, users(full_name,role)")
    .is("revoked_at", null)
    .order("last_active_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="settings" size={20} className="text-textSecondary" /> الجلسات النشطة</h1>
        <div className="space-y-2">
          {(sessions ?? []).map((s: any) => (
            <div key={s.id} className="card flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{s.users?.full_name} ({s.users?.role})</p>
                <p className="text-textSecondary">{s.device_info} — آخر نشاط: {new Date(s.last_active_at).toLocaleString("ar-EG")}</p>
              </div>
              <RevokeSessionButton sessionId={s.id} />
            </div>
          ))}
          {(sessions ?? []).length === 0 && <p className="text-sm text-textSecondary">لا توجد جلسات نشطة مسجّلة.</p>}
        </div>
      </main>
    </>
  );
}
