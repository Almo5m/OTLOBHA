import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import { Badge } from "@/components/Badge";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AdminInvoicesPage() {
  const supabase = createServerSupabase();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(200);

  const list = invoices ?? [];

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["invoices"]} channelName="admin-invoices-list" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="invoice" size={20} className="text-textSecondary" /> الفواتير
        </h1>

        {list.length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا توجد فواتير بعد" />
        ) : (
          <>
            {/* Mobile: Stacked Cards */}
            <div className="grid gap-3 md:hidden">
              {list.map((inv: any) => (
                <div key={inv.id} className="card">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="numeric font-medium">{inv.invoice_number}</span>
                    <span className="numeric text-sm text-textSecondary">{inv.orders?.order_number}</span>
                  </div>
                  <p className="numeric mb-2 text-lg font-bold">{inv.grand_total} ج.م</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.status === "approved" ? "success" : inv.status === "canceled" ? "error" : "neutral"}>
                      {inv.status === "approved" ? "معتمدة" : inv.status === "canceled" ? "ملغاة" : "مسودة"}
                    </Badge>
                    <Badge variant={inv.payment_status === "paid" ? "success" : "warning"}>
                      {inv.payment_status === "paid" ? "مدفوعة" : "غير مدفوعة"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/Tablet: Data Table */}
            <div className="hidden overflow-x-auto rounded-lg border border-borderc bg-surface md:block">
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
                  {list.map((inv: any) => (
                    <tr key={inv.id} className="border-t border-borderc transition-colors duration-fast hover:bg-surfaceElevated">
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
          </>
        )}
      </main>
    </>
  );
}
