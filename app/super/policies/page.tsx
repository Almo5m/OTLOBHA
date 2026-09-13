import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import PolicyForm from "@/components/PolicyForm";

export default async function PoliciesPage() {
  const supabase = createServerSupabase();
  const { data: policies } = await supabase.from("policies").select("*").order("published_at", { ascending: false });

  const hasTerms = (policies ?? []).some((p) => p.type === "terms");

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-2 flex items-center gap-2 text-xl font-bold"><Icon name="invoice" size={20} className="text-accent" /> الشروط والسياسات</h1>

        {!hasTerms && (
          <div className="mb-4 alert alert-error">
            ⚠️ لا توجد نسخة من "الشروط والأحكام" بعد. أي عميل يحاول إرسال طلب الآن سيفشل الطلب. أضِف نسخة أولى الآن.
          </div>
        )}

        <PolicyForm />

        <div className="mt-6 space-y-2">
          {(policies ?? []).map((p) => (
            <div key={p.id} className="card text-sm">
              <p className="font-medium">{p.type === "terms" ? "الشروط والأحكام" : "سياسة الخصوصية"} — إصدار {p.version}</p>
              <p className="mt-1 line-clamp-2 text-textSecondary">{p.content}</p>
              <p className="mt-1 text-xs text-textSecondary">{new Date(p.published_at).toLocaleString("ar-EG")}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
