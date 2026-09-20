import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import RecordCommissionPaymentForm from "@/components/RecordCommissionPaymentForm";

export default async function CommissionPage() {
  const supabase = await createServerSupabase();
  const { data: ledger } = await supabase
    .from("commission_ledger")
    .select("*, orders(order_number)")
    .order("completed_at", { ascending: false })
    .limit(200);
  const { data: payments } = await supabase
    .from("commission_payments")
    .select("*")
    .order("paid_at", { ascending: false });

  const totalDue = (ledger ?? []).filter((l) => l.status === "due").reduce((s, l) => s + Number(l.commission_amount), 0);

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="wallet" size={20} className="text-textSecondary" /> العمولة</h1>

        <div className="card mb-4">
          <p className="text-sm text-textSecondary">إجمالي العمولة المستحقة حاليًا</p>
          <p className="text-2xl font-bold text-accent">{totalDue.toFixed(2)} ج.م</p>
        </div>

        <RecordCommissionPaymentForm />

        <h2 className="mb-2 mt-6 font-medium">سجل العمولة لكل طلب</h2>
        <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surfaceElevated text-right">
              <tr>
                <th className="px-3 py-2">الطلب</th>
                <th className="px-3 py-2">تاريخ الاكتمال</th>
                <th className="px-3 py-2">النسبة المطبقة</th>
                <th className="px-3 py-2">قيمة العمولة</th>
                <th className="px-3 py-2">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(ledger ?? []).map((l: any) => (
                <tr key={l.id} className="border-t border-borderc">
                  <td className="px-3 py-2">{l.orders?.order_number}</td>
                  <td className="px-3 py-2 text-textSecondary">{new Date(l.completed_at).toLocaleDateString("ar-EG")}</td>
                  <td className="px-3 py-2">{(Number(l.commission_rate_applied) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{l.commission_amount} ج.م</td>
                  <td className="px-3 py-2">{l.status === "paid" ? "مدفوعة" : "مستحقة"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mb-2 mt-6 font-medium">سجل دفعات العمولة</h2>
        <div className="space-y-2">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="card text-sm">
              <p>{p.amount} ج.م — {p.period_from} إلى {p.period_to}</p>
              <p className="text-textSecondary">{p.notes}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
