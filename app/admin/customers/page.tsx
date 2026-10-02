import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";

// مفيش حسابات عملاء: العميل بيتعرّف برقم موبايله ويتجمّع من الطلبات.
export default async function AdminCustomersPage() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("get_top_customers", { p_limit: 500 });
  const customers: any[] = data ?? [];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-bold">
          <Icon name="customer" size={20} className="text-textSecondary" /> العملاء
        </h1>
        <p className="mb-4 text-xs text-textSecondary">العملاء بيتجمّعوا برقم الموبايل من طلباتهم (من غير حسابات).</p>

        {customers.length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا يوجد عملاء بعد" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-surfaceElevated text-right">
                <tr>
                  <th className="px-3 py-2">الاسم</th>
                  <th className="px-3 py-2">الموبايل</th>
                  <th className="px-3 py-2">طلبات مكتملة</th>
                  <th className="px-3 py-2">إجمالي المشتريات</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.phone} className="border-t border-borderc hover:bg-surfaceElevated">
                    <td className="px-3 py-2">{c.full_name}</td>
                    <td className="numeric px-3 py-2" dir="ltr">{c.phone}</td>
                    <td className="numeric px-3 py-2">{c.order_count}</td>
                    <td className="numeric px-3 py-2">{c.total_spent} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
