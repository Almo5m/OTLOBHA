import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import ComplaintStatusSelect from "@/components/ComplaintStatusSelect";
import { ComplaintStatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";
import RealtimeRefresher from "@/components/RealtimeRefresher";

export default async function AdminComplaintsPage() {
  const supabase = await createServerSupabase();
  const { data: complaints } = await supabase
    .from("complaints")
    .select("*, orders(order_number)")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminNav />
      <RealtimeRefresher tables={["complaints"]} channelName="admin-complaints-list" />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">الشكاوى</h1>
        {(complaints ?? []).length === 0 ? (
          <EmptyState illustration={<SearchEmptyIllustration />} title="لا توجد شكاوى حاليًا" />
        ) : (
        <div className="space-y-2">
          {(complaints ?? []).map((c: any) => (
            <div key={c.id} className="card animate-fadeIn">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{c.type} — {c.customer_name}</p>
                  <ComplaintStatusBadge status={c.status} />
                </div>
                <ComplaintStatusSelect complaintId={c.id} status={c.status} />
              </div>
              <p className="text-sm text-textSecondary">{c.details}</p>
              <p className="numeric mt-1 text-xs text-textSecondary" dir="ltr">
                <a href={`https://wa.me/2${c.customer_phone}`} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">{c.customer_phone}</a>
                {c.orders?.order_number ? ` · ${c.orders.order_number}` : ""}
              </p>
              <p className="numeric mt-1 text-xs text-textSecondary/70">{new Date(c.created_at).toLocaleString("ar-EG")}</p>
            </div>
          ))}
        </div>
        )}
      </main>
    </>
  );
}
