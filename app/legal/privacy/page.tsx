import { createServerSupabase } from "@/lib/supabase/server";
import Wordmark from "@/components/Wordmark";
import Link from "next/link";

export default async function PrivacyPage() {
  const supabase = createServerSupabase();
  const { data: policy } = await supabase
    .from("policies")
    .select("content, version, published_at")
    .eq("type", "privacy")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/home" className="mb-6 inline-block"><Wordmark /></Link>
      <h1 className="mb-1 text-xl font-bold">سياسة الخصوصية</h1>
      {policy ? (
        <>
          <p className="mb-4 text-xs text-textSecondary">إصدار {policy.version}</p>
          <div className="card whitespace-pre-line text-sm leading-relaxed">{policy.content}</div>
        </>
      ) : (
        <p className="text-sm text-textSecondary">لم يتم نشر سياسة الخصوصية بعد.</p>
      )}
    </main>
  );
}
