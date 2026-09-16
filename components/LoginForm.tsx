"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Wordmark from "@/components/Wordmark";
import PasswordInput from "@/components/PasswordInput";

const ROLE_HOME: Record<string, string> = {
  customer: "/home",
  delivery_agent: "/agent/dashboard",
  business_admin: "/admin/dashboard",
  super_admin: "/admin/dashboard"
};

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const returnTo = useSearchParams().get("returnTo");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Supabase Auth يعتمد على صيغة بريد وهمية داخلية مبنية على رقم الهاتف
    const { error } = await supabase.auth.signInWithPassword({
      email: `${phone}@otlobha.local`,
      password
    });

    setLoading(false);
    if (error) {
      setError("رقم الهاتف أو كلمة المرور غير صحيحة");
      return;
    }

    // لو العميل كان جاي من خطوة في الطلب (زي متابعة الدفع)، نرجّعه لنفس
    // المكان بدل ما نوديه للصفحة الرئيسية — تجربة متصلة وليست منقطعة
    if (returnTo) {
      router.refresh();
      router.push(returnTo);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("users").select("role").eq("id", user?.id).single();

    router.refresh();
    router.push(ROLE_HOME[profile?.role ?? "customer"]);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-1"><Wordmark /></div>
      <p className="mb-8 text-sm text-textSecondary">خدمة التوصيل المحلية — المنيب</p>

      {returnTo && (
        <div className="alert alert-info mb-6">
          سجّل الدخول عشان تكمّل طلبك من نفس المكان اللي وقفت فيه.
        </div>
      )}

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
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-textSecondary">
        نسيت كلمة المرور؟ تواصل مع الخدمة لإعادة تعيينها.
      </p>
      <p className="mt-2 text-center text-sm">
        ليس لديك حساب؟{" "}
        <Link href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"} className="text-accent underline">
          إنشاء حساب جديد
        </Link>
      </p>
    </main>
  );
}
