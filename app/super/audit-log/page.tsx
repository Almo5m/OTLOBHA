import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";

export default async function AuditLogPage() {
  const supabase = await createServerSupabase();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="reports" size={20} className="text-textSecondary" /> Audit Log</h1>
        <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
          <table className="w-full text-xs">
            <thead className="bg-surfaceElevated text-right">
              <tr>
                <th className="px-3 py-2">التاريخ</th>
                <th className="px-3 py-2">الدور</th>
                <th className="px-3 py-2">العملية</th>
                <th className="px-3 py-2">الكيان</th>
                <th className="px-3 py-2">السبب</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((l) => (
                <tr key={l.id} className="border-t border-borderc">
                  <td className="px-3 py-2 text-textSecondary">{new Date(l.created_at).toLocaleString("ar-EG")}</td>
                  <td className="px-3 py-2">{l.actor_role}</td>
                  <td className="px-3 py-2">{l.action}</td>
                  <td className="px-3 py-2">{l.entity_type}</td>
                  <td className="px-3 py-2">{l.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
