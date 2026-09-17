import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ExportExcelButton from "@/components/ExportExcelButton";
import Icon from "@/components/Icon";
import IconBadge from "@/components/IconBadge";

export default async function AdminReportsPage() {
  const supabase = createServerSupabase();

  const { data: orders } = await supabase
    .from("orders")
    .select("order_number,status,payment_method,delivery_fee_applied,created_at,delivered_at,users!orders_customer_id_fkey(full_name,phone)")
    .order("created_at", { ascending: false })
    .limit(1000);

  const { data: topProducts } = await supabase.rpc("get_top_products");
  const { data: agentPerf } = await supabase.rpc("get_agent_performance");
  const { data: topCustomers } = await supabase.rpc("get_top_customers", { p_limit: 500 });

  const ordersReport = (orders ?? []).map((o: any) => ({
    "رقم الطلب": o.order_number, "العميل": o.users?.full_name, "الهاتف": o.users?.phone,
    "الحالة": o.status, "طريقة الدفع": o.payment_method, "رسوم التوصيل": o.delivery_fee_applied,
    "تاريخ الإنشاء": o.created_at, "تاريخ التسليم": o.delivered_at
  }));

  const productsReport = (topProducts ?? []).map((p: any) => ({
    "المنتج": p.product_name, "عدد مرات الطلب": p.times_ordered, "إجمالي الكمية": p.total_quantity
  }));

  const agentsReport = (agentPerf ?? []).map((a: any) => ({
    "المندوب": a.full_name, "طلبات مكتملة": a.completed_orders, "طلبات نشطة": a.active_orders, "متوسط التقييم": a.avg_rating
  }));

  const customersReport = (topCustomers ?? []).map((c: any) => ({
    "العميل": c.full_name, "الهاتف": c.phone, "عدد الطلبات المكتملة": c.order_count, "إجمالي الإنفاق": c.total_spent
  }));

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="reports" size={20} className="text-textSecondary" /> التقارير
        </h1>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="card flex items-center gap-3">
            <IconBadge name="orders" tone="accent" size="sm" />
            <span className="flex-1">تقرير الطلبات الكامل (<span className="numeric">{(orders ?? []).length}</span> طلب)</span>
            <ExportExcelButton data={ordersReport} filename="تقرير-الطلبات" label="تصدير Excel" />
          </div>
          <div className="card flex items-center gap-3">
            <IconBadge name="products" tone="brand" size="sm" />
            <span className="flex-1">المنتجات الأكثر طلبًا</span>
            <ExportExcelButton data={productsReport} filename="المنتجات-الاكثر-طلبا" label="تصدير Excel" />
          </div>
          <div className="card flex items-center gap-3">
            <IconBadge name="agent" tone="info" size="sm" />
            <span className="flex-1">أداء المندوبين</span>
            <ExportExcelButton data={agentsReport} filename="اداء-المندوبين" label="تصدير Excel" />
          </div>
          <div className="card flex items-center gap-3">
            <IconBadge name="customer" tone="warning" size="sm" />
            <span className="flex-1">أكثر العملاء طلبًا</span>
            <ExportExcelButton data={customersReport} filename="اكثر-العملاء-طلبا" label="تصدير Excel" />
          </div>
        </div>

        <h2 className="mb-3 mt-8 font-bold">أفضل 10 عملاء</h2>
        <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surfaceElevated text-right">
              <tr>
                <th className="px-3 py-2">العميل</th>
                <th className="px-3 py-2">طلبات مكتملة</th>
                <th className="px-3 py-2">إجمالي الإنفاق</th>
              </tr>
            </thead>
            <tbody>
              {(topCustomers ?? []).slice(0, 10).map((c: any) => (
                <tr key={c.customer_id} className="border-t border-borderc">
                  <td className="px-3 py-2">{c.full_name} — <span className="numeric text-textSecondary">{c.phone}</span></td>
                  <td className="numeric px-3 py-2">{c.order_count}</td>
                  <td className="numeric px-3 py-2">{c.total_spent} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
