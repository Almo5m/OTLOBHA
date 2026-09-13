"use client";

import { useRouter } from "next/navigation";
import AgentNav from "@/components/AgentNav";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

export default function AgentProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <AgentNav />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="account" size={20} className="text-accent" /> حسابي</h1>
        <button onClick={handleLogout} className="text-sm text-error">تسجيل الخروج</button>
      </main>
    </>
  );
}
