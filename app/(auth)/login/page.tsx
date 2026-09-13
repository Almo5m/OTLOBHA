"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Wordmark from "@/components/Wordmark";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Supabase Auth يعتمد على صيغة بريد وهمية داخلية مبنية على رقم الهاتف
    // (راجع ملاحظة تسجيل حساب جديد لتفاصيل هذا القرار)
    const { error } = await supabase.auth.signInWithPassword({
      email: `${phone}@otlobha.local`,
      password
    });

    setLoading(false);
    if (error) {
      setError("رقم الهاتف أو كلمة المرور غير صحيحة");
      return;
    }

    // نجيب الدور فورًا عشان نوجّه كل حد لمكانه الصحيح (عميل/مندوب/إداري)
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("role").eq("id", user?.id).single();

    const roleHome: Record<string, string> = {
      customer: "/home",
      delivery_agent: "/agent/dashboard",
      business_admin: "/admin/dashboard",
      super_admin: "/admin/dashboard"
    };

    router.refresh();
    router.push(roleHome[profile?.role ?? "customer"]);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-1"><Wordmark /></div>
      <p className="mb-8 text-sm text-textSecondary">خدمة التوصيل المحلية — المنيب</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="phone">رقم الهاتف</label>
          <input
            id="phone" className="input" inputMode="numeric" placeholder="01xxxxxxxxx"
            value={phone} onChange={(e) => setPhone(e.target.value)} required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">كلمة المرور</label>
          <input
            id="password" type="password" className="input"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-textSecondary">
        نسيت كلمة المرور؟ تواصل مع الخدمة لإعادة تعيينها.
      </p>
      <p className="mt-2 text-center text-sm">
        ليس لديك حساب؟ <Link href="/register" className="text-primary underline">إنشاء حساب جديد</Link>
      </p>
    </main>
  );
}
