import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import Icon from "@/components/Icon";
import { DebtStatusBadge } from "@/components/Badge";

export default async function DebtsPage() {
  const supabase = createServerSupabase();
  const { data: debts } = await supabase.from("debts").select("*").order("created_at", { ascending: false });

  const outstanding = (debts ?? []).filter((d) => d.status !== "settled");
  const totalOutstanding = outstanding.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6 lg:max-w-4xl">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="debt" size={20} className="text-textSecondary" /> المديونية</h1>

        <div className="card mb-4">
          <p className="text-sm text-textSecondary">الإجمالي المستحق حاليًا</p>
          <p className="numeric text-2xl font-bold text-accent">{totalOutstanding.toFixed(2)} ج.م</p>
          <p className="mt-1 text-xs text-textSecondary">تُضاف هذه القيمة تلقائيًا لفاتورة طلبك القادم.</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {(debts ?? []).map((d) => (
            <div key={d.id} className="card">
              <div className="flex items-center justify-between text-sm">
                <span className="numeric">{d.amount} ج.م</span>
                <DebtStatusBadge status={d.status} />
              </div>
              <p className="numeric mt-1 text-xs text-textSecondary">{new Date(d.created_at).toLocaleDateString("ar-EG")}</p>
            </div>
          ))}
          {(debts ?? []).length === 0 && <p className="text-sm text-textSecondary">لا توجد أي مديونية على حسابك.</p>}
        </div>
      </main>
    </>
  );
}
