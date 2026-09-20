import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import CustomerRowActions from "@/components/CustomerRowActions";
import IssueResetLinkButton from "@/components/IssueResetLinkButton";
import Icon from "@/components/Icon";
import { Badge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AdminCustomersPage() {
  const supabase = await createServerSupabase();
  const { data: customers } = await supabase
    .from("users")
    .select("id,full_name,phone,status,created_at")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["users", "customer_discounts"]} channelName="admin-customers-list" />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="customer" size={20} className="text-textSecondary" /> العملاء
        </h1>

        {(customers ?? []).length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا يوجد عملاء بعد" />
        ) : (
          <>
            {/* Mobile: Stacked Cards */}
            <div className="grid gap-3 md:hidden">
              {(customers ?? []).map((c) => (
                <div key={c.id} className="card">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{c.full_name}</p>
                    <Badge variant={c.status === "active" ? "success" : "error"}>
                      {c.status === "active" ? "نشط" : "محظور"}
                    </Badge>
                  </div>
                  <p className="numeric mb-3 text-sm text-textSecondary">{c.phone}</p>
                  <div className="flex items-center gap-4 border-t border-borderc pt-2">
                    <CustomerRowActions customerId={c.id} status={c.status} />
                    <IssueResetLinkButton phone={c.phone} />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/Tablet: Data Table */}
            <div className="hidden overflow-x-auto rounded-lg border border-borderc bg-surface md:block">
              <table className="w-full text-sm">
                <thead className="bg-surfaceElevated text-right">
                  <tr>
                    <th className="px-3 py-2">الاسم</th>
                    <th className="px-3 py-2">الهاتف</th>
                    <th className="px-3 py-2">الحالة</th>
                    <th className="px-3 py-2"></th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(customers ?? []).map((c) => (
                    <tr key={c.id} className="border-t border-borderc transition-colors duration-fast hover:bg-surfaceElevated">
                      <td className="px-3 py-2">{c.full_name}</td>
                      <td className="numeric px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2">
                        <Badge variant={c.status === "active" ? "success" : "error"}>
                          {c.status === "active" ? "نشط" : "محظور"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2"><CustomerRowActions customerId={c.id} status={c.status} /></td>
                      <td className="px-3 py-2"><IssueResetLinkButton phone={c.phone} /></td>
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
