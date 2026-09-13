import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import SettleDebtButton from "@/components/SettleDebtButton";
import { DebtStatusBadge } from "@/components/Badge";

export default async function AdminDebtsPage() {
  const supabase = createServerSupabase();
  const { data: debts } = await supabase
    .from("debts")
    .select("*, users!debts_customer_id_fkey(full_name,phone), debt_settlements(amount_paid)")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">الديون</h1>
        <div className="space-y-2">
          {(debts ?? []).map((d: any) => {
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
          {(debts ?? []).length === 0 && <p className="text-sm text-textSecondary">لا توجد ديون مسجّلة.</p>}
        </div>
      </main>
    </>
  );
}
