import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import { Badge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";

const AVAILABILITY_LABELS: Record<string, { label: string; variant: "success" | "warning" | "neutral" }> = {
  available: { label: "متاح", variant: "success" },
  busy: { label: "مشغول", variant: "warning" },
  offline: { label: "غير متصل", variant: "neutral" }
};

export default async function AdminAgentsPage() {
  const supabase = createServerSupabase();
  const { data: performance } = await supabase.rpc("get_agent_performance");
  const { data: agents } = await supabase
    .from("users").select("id,full_name,phone,agent_profiles(availability_status)")
    .eq("role", "delivery_agent");

  const rows = (agents ?? []).map((a: any) => ({
    ...a,
    perf: (performance ?? []).find((p: any) => p.agent_id === a.id),
    av: AVAILABILITY_LABELS[a.agent_profiles?.[0]?.availability_status] ?? AVAILABILITY_LABELS.offline
  }));

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="agent" size={20} className="text-accent" /> المندوبين
        </h1>

        {rows.length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا يوجد مندوبين بعد" />
        ) : (
          <>
            {/* Mobile: Stacked Cards */}
            <div className="grid gap-3 md:hidden">
              {rows.map((a) => (
                <div key={a.id} className="card">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{a.full_name}</p>
                    <Badge variant={a.av.variant}>{a.av.label}</Badge>
                  </div>
                  <p className="numeric mb-2 text-sm text-textSecondary">{a.phone}</p>
                  <div className="flex items-center gap-4 border-t border-borderc pt-2 text-sm">
                    <span>مكتملة: <span className="numeric font-medium">{a.perf?.completed_orders ?? 0}</span></span>
                    <span>نشطة: <span className="numeric font-medium">{a.perf?.active_orders ?? 0}</span></span>
                    {a.perf?.avg_rating && (
                      <span className="flex items-center gap-1">
                        <Icon name="rating" size={13} className="text-warning" />
                        <span className="numeric">{a.perf.avg_rating}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/Tablet: Data Table */}
            <div className="hidden overflow-x-auto rounded-lg border border-borderc bg-surface md:block">
              <table className="w-full text-sm">
                <thead className="bg-surfaceElevated text-right">
                  <tr>
                    <th className="px-3 py-2">الاسم</th>
                    <th className="px-3 py-2">الهاتف</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2">طلبات مكتملة</th>
                    <th className="px-3 py-2">طلبات نشطة</th>
                    <th className="px-3 py-2">متوسط التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="border-t border-borderc transition-colors duration-fast hover:bg-surfaceElevated">
                      <td className="px-3 py-2">{a.full_name}</td>
                      <td className="numeric px-3 py-2">{a.phone}</td>
                      <td className="px-3 py-2"><Badge variant={a.av.variant}>{a.av.label}</Badge></td>
                      <td className="numeric px-3 py-2">{a.perf?.completed_orders ?? 0}</td>
                      <td className="numeric px-3 py-2">{a.perf?.active_orders ?? 0}</td>
                      <td className="px-3 py-2">
                        {a.perf?.avg_rating ? (
                          <span className="flex items-center gap-1">
                            <Icon name="rating" size={14} className="text-warning" />
                            <span className="numeric">{a.perf.avg_rating}</span>
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
