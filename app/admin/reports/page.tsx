import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ExportExcelButton from "@/components/ExportExcelButton";
import Icon from "@/components/Icon";
import IconBadge from "@/components/IconBadge";
import { OrderStatusBadge } from "@/components/Badge";

// الصفحة دي بقت Super Admin بس (يتفحص كمان في middleware.ts) — بيانات مالية
// وأداء حساسة مالهاش لازمة لـBusiness Admin
export default async function AdminReportsPage() {
  const supabase = await createServerSupabase();

  const [{ data: orders }, { data: topProducts }, { data: agentPerf }, { data: topCustomers }, { data: financial }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("order_number,status,payment_method,delivery_fee_applied,created_at,delivered_at,users!orders_customer_id_fkey(full_name,phone)")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.rpc("get_top_products"),
      supabase.rpc("get_agent_performance"),
      supabase.rpc("get_top_customers", { p_limit: 500 }),
      supabase.rpc("get_financial_summary").single()
    ]);

  const f: any = financial ?? {};

  // تجميع حقيقي لعدد الطلبات حسب الحالة — بدل رقم إجمالي واحد بس
  const statusCounts = (orders ?? []).reduce((acc: Record<string, number>, o: any) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const topProductsSorted = (topProducts ?? []).slice().sort((a: any, b: any) => (b.times_ordered ?? 0) - (a.times_ordered ?? 0));
  const agentPerfSorted = (agentPerf ?? []).slice().sort((a: any, b: any) => (b.completed_orders ?? 0) - (a.completed_orders ?? 0));
  const topCustomersSorted = (topCustomers ?? []);

  const ordersReport = (orders ?? []).map((o: any) => ({
    "رقم الطلب": o.order_number, "العميل": o.users?.full_name, "الهاتف": o.users?.phone,
    "الحالة": o.status, "طريقة الدفع": o.payment_method, "رسوم التوصيل": o.delivery_fee_applied,
    "تاريخ الإنشاء": o.created_at, "تاريخ التسليم": o.delivered_at
  }));
  const productsReport = topProductsSorted.map((p: any) => ({
    "المنتج": p.product_name, "عدد مرات الطلب": p.times_ordered, "إجمالي الكمية": p.total_quantity
  }));
  const agentsReport = agentPerfSorted.map((a: any) => ({
    "المندوب": a.full_name, "طلبات مكتملة": a.completed_orders, "طلبات نشطة": a.active_orders, "متوسط التقييم": a.avg_rating
  }));
  const customersReport = topCustomersSorted.map((c: any) => ({
    "العميل": c.full_name, "الهاتف": c.phone, "عدد الطلبات المكتملة": c.order_count, "إجمالي الإنفاق": c.total_spent
  }));

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-5 flex items-center gap-2 text-xl font-bold">
          <Icon name="reports" size={20} className="text-textSecondary" /> التقارير
        </h1>

        {/* ملخص مالي حقيقي — من نفس مصدر بيانات الداشبورد، مش أرقام تقديرية */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card">
            <IconBadge name="wallet" tone="brand" size="sm" />
            <p className="numeric mt-2 text-lg font-bold">{(f.total_sales ?? 0).toLocaleString("ar-EG")}</p>
            <p className="text-xs text-textSecondary">إجمالي المبيعات (ج.م)</p>
          </div>
          <div className="card">
            <IconBadge name="debt" tone="warning" size="sm" />
            <p className="numeric mt-2 text-lg font-bold">{(f.outstanding_debts ?? 0).toLocaleString("ar-EG")}</p>
            <p className="text-xs text-textSecondary">ديون مستحقة (ج.م)</p>
          </div>
          <div className="card">
            <IconBadge name="payment" tone="info" size="sm" />
            <p className="numeric mt-2 text-lg font-bold">{(f.commission_due ?? 0).toLocaleString("ar-EG")}</p>
            <p className="text-xs text-textSecondary">عمولة مستحقة (ج.م)</p>
          </div>
          <div className="card">
            <IconBadge name="check" tone="accent" size="sm" />
            <p className="numeric mt-2 text-lg font-bold">{(f.commission_paid ?? 0).toLocaleString("ar-EG")}</p>
            <p className="text-xs text-textSecondary">عمولة متحصّلة (ج.م)</p>
          </div>
        </div>

        {/* الطلبات حسب الحالة — عدد حقيقي لكل حالة بدل رقم إجمالي واحد */}
        <section className="card mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon name="orders" size={17} className="text-textSecondary" /> الطلبات (<span className="numeric">{(orders ?? []).length}</span> من آخر 1000)
            </h2>
            <ExportExcelButton data={ordersReport} filename="تقرير-الطلبات" label="تصدير Excel" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 rounded-full border border-borderc py-1 pr-1 pl-3 text-sm">
                <OrderStatusBadge status={status} />
                <span className="numeric font-medium">{count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* المنتجات الأكثر طلبًا — جدول حقيقي بدل زرار تصدير بس */}
        <section className="card mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon name="products" size={17} className="text-textSecondary" /> المنتجات الأكثر طلبًا
            </h2>
            <ExportExcelButton data={productsReport} filename="المنتجات-الاكثر-طلبا" label="تصدير Excel" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-borderc">
            <table className="w-full text-sm">
              <thead className="bg-surfaceElevated text-right">
                <tr>
                  <th className="px-3 py-2">المنتج</th>
                  <th className="px-3 py-2">عدد مرات الطلب</th>
                  <th className="px-3 py-2">إجمالي الكمية</th>
                </tr>
              </thead>
              <tbody>
                {topProductsSorted.slice(0, 10).map((p: any, i: number) => (
                  <tr key={i} className="border-t border-borderc">
                    <td className="px-3 py-2">{p.product_name}</td>
                    <td className="numeric px-3 py-2">{p.times_ordered}</td>
                    <td className="numeric px-3 py-2">{p.total_quantity}</td>
                  </tr>
                ))}
                {topProductsSorted.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-textSecondary">لا توجد بيانات كفاية بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {topProductsSorted.length > 10 && (
            <p className="mt-2 text-xs text-textSecondary">المعروض أول 10 — صدّر الملف لعرض القائمة كاملة.</p>
          )}
        </section>

        {/* أداء المندوبين — جدول حقيقي */}
        <section className="card mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon name="agent" size={17} className="text-textSecondary" /> أداء المندوبين
            </h2>
            <ExportExcelButton data={agentsReport} filename="اداء-المندوبين" label="تصدير Excel" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-borderc">
            <table className="w-full text-sm">
              <thead className="bg-surfaceElevated text-right">
                <tr>
                  <th className="px-3 py-2">المندوب</th>
                  <th className="px-3 py-2">طلبات مكتملة</th>
                  <th className="px-3 py-2">طلبات نشطة</th>
                  <th className="px-3 py-2">متوسط التقييم</th>
                </tr>
              </thead>
              <tbody>
                {agentPerfSorted.map((a: any) => (
                  <tr key={a.agent_id} className="border-t border-borderc">
                    <td className="px-3 py-2">{a.full_name}</td>
                    <td className="numeric px-3 py-2">{a.completed_orders}</td>
                    <td className="numeric px-3 py-2">{a.active_orders}</td>
                    <td className="numeric px-3 py-2">{a.avg_rating ? `${a.avg_rating} ⭐` : "—"}</td>
                  </tr>
                ))}
                {agentPerfSorted.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center text-textSecondary">لا يوجد مندوبين بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* أفضل العملاء — جدول حقيقي */}
        <section className="card mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold">
              <Icon name="customer" size={17} className="text-textSecondary" /> أفضل العملاء
            </h2>
            <ExportExcelButton data={customersReport} filename="اكثر-العملاء-طلبا" label="تصدير Excel" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-borderc">
            <table className="w-full text-sm">
              <thead className="bg-surfaceElevated text-right">
                <tr>
                  <th className="px-3 py-2">العميل</th>
                  <th className="px-3 py-2">طلبات مكتملة</th>
                  <th className="px-3 py-2">إجمالي الإنفاق</th>
                </tr>
              </thead>
              <tbody>
                {topCustomersSorted.slice(0, 10).map((c: any) => (
                  <tr key={c.customer_id} className="border-t border-borderc">
                    <td className="px-3 py-2">{c.full_name} — <span className="numeric text-textSecondary">{c.phone}</span></td>
                    <td className="numeric px-3 py-2">{c.order_count}</td>
                    <td className="numeric px-3 py-2">{c.total_spent} ج.م</td>
                  </tr>
                ))}
                {topCustomersSorted.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-4 text-center text-textSecondary">لا يوجد عملاء بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {topCustomersSorted.length > 10 && (
            <p className="mt-2 text-xs text-textSecondary">المعروض أول 10 — صدّر الملف لعرض القائمة كاملة.</p>
          )}
        </section>
      </main>
    </>
  );
}
