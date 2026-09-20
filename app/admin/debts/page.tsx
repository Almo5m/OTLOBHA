import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import SettleDebtButton from "@/components/SettleDebtButton";
import { DebtStatusBadge } from "@/components/Badge";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import SuccessIllustration from "@/components/illustrations/SuccessIllustration";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AdminDebtsPage() {
  const supabase = await createServerSupabase();
  const { data: debts } = await supabase
    .from("debts")
    .select("*, users!debts_customer_id_fkey(full_name,phone), debt_settlements(amount_paid)")
    .order("created_at", { ascending: false });

  const list = debts ?? [];

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["debts"]} channelName="admin-debts-list" />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="debt" size={20} className="text-textSecondary" /> الديون
        </h1>
        {list.length === 0 ? (
          <EmptyState illustration={<SuccessIllustration />} title="مفيش ديون مسجّلة حاليًا" description="كل الحسابات متوازنة 👍" />
        ) : (
        <div className="space-y-2">
          {list.map((d: any) => {
            const paid = (d.debt_settlements ?? []).reduce((s: number, x: any) => s + Number(x.amount_paid), 0);
            const remaining = Number(d.amount) - paid;
            return (
              <div key={d.id} className="card flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{d.users?.full_name} — <span className="numeric">{d.users?.phone}</span></p>
                  <p className="text-textSecondary">المبلغ: <span className="numeric">{d.amount}</span> ج.م — المتبقي: <span className="numeric">{remaining.toFixed(2)}</span> ج.م — السبب: {d.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  <DebtStatusBadge status={d.status} />
                  {d.status !== "settled" && <SettleDebtButton debtId={d.id} remaining={remaining} />}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </main>
    </>
  );
}
