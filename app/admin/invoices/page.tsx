import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import { Badge } from "@/components/Badge";

export default async function AdminInvoicesPage() {
  const supabase = createServerSupabase();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">الفواتير</h1>
        <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surfaceElevated text-right">
              <tr>
                <th className="px-3 py-2">رقم الفاتورة</th>
                <th className="px-3 py-2">الطلب</th>
                <th className="px-3 py-2">الإجمالي</th>
                <th className="px-3 py-2">الحالة</th>
                <th className="px-3 py-2">الدفع</th>
              </tr>
            </thead>
            <tbody>
              {(invoices ?? []).map((inv: any) => (
                <tr key={inv.id} className="border-t border-borderc">
                  <td className="numeric px-3 py-2">{inv.invoice_number}</td>
                  <td className="numeric px-3 py-2">{inv.orders?.order_number}</td>
                  <td className="numeric px-3 py-2">{inv.grand_total} ج.م</td>
                  <td className="px-3 py-2">
                    <Badge variant={inv.status === "approved" ? "success" : inv.status === "canceled" ? "error" : "neutral"}>
                      {inv.status === "approved" ? "معتمدة" : inv.status === "canceled" ? "ملغاة" : "مسودة"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={inv.payment_status === "paid" ? "success" : "warning"}>
                      {inv.payment_status === "paid" ? "مدفوعة" : "غير مدفوعة"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
