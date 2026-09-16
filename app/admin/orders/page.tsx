import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";
import Icon from "@/components/Icon";

export default async function AdminOrdersPage() {
  const supabase = createServerSupabase();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_number,status,created_at,payment_method,users!orders_customer_id_fkey(full_name,phone)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="orders" size={20} className="text-textSecondary" /> الطلبات
        </h1>

        {(orders ?? []).length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا توجد طلبات بعد" />
        ) : (
          <>
            {/* Mobile: Stacked Cards */}
            <div className="grid gap-3 md:hidden">
              {(orders ?? []).map((o: any) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="card card-interactive block animate-fadeIn">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="numeric font-medium">{o.order_number}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-textSecondary">{o.users?.full_name} — <span className="numeric">{o.users?.phone}</span></p>
                  <p className="numeric mt-1 text-xs text-textSecondary">{new Date(o.created_at).toLocaleString("ar-EG")}</p>
                </Link>
              ))}
            </div>

            {/* Desktop/Tablet: Data Table */}
            <div className="hidden overflow-x-auto rounded-lg border border-borderc bg-surface md:block">
              <table className="w-full text-sm">
                <thead className="bg-surfaceElevated text-right">
                  <tr>
                    <th className="px-3 py-2">رقم الطلب</th>
                    <th className="px-3 py-2">العميل</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2">التاريخ</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(orders ?? []).map((o: any) => (
                    <tr key={o.id} className="border-t border-borderc transition-colors duration-fast hover:bg-surfaceElevated">
                      <td className="numeric px-3 py-2">{o.order_number}</td>
                      <td className="px-3 py-2">{o.users?.full_name} — <span className="numeric">{o.users?.phone}</span></td>
                      <td className="px-3 py-2"><OrderStatusBadge status={o.status} /></td>
                      <td className="numeric px-3 py-2 text-textSecondary">{new Date(o.created_at).toLocaleString("ar-EG")}</td>
                      <td className="px-3 py-2">
                        <Link href={`/admin/orders/${o.id}`} className="text-accent underline">التفاصيل</Link>
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
