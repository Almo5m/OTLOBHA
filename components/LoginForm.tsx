"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Wordmark from "@/components/Wordmark";
import PasswordInput from "@/components/PasswordInput";
import ContactSupportLink from "@/components/ContactSupportLink";
import Icon from "@/components/Icon";
import { recordSession } from "@/lib/record-session";

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

    const { data: { user } } = await supabase.auth.getUser();
    if (user) recordSession(user.id);

    // لو العميل كان جاي من خطوة في الطلب (زي متابعة الدفع)، نرجّعه لنفس
    // المكان بدل ما نوديه للصفحة الرئيسية — تجربة متصلة وليست منقطعة
    if (returnTo) {
      router.refresh();
      router.push(returnTo);
      return;
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", user?.id).single();

    router.refresh();
    router.push(ROLE_HOME[profile?.role ?? "customer"]);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* خلفية زخرفية بسيطة بلون البراند بدل الخلفية الفاضية — بلمسة هوية بس
          من غير ما تلفت النظر عن الفورم نفسه */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-brand/15 to-transparent"
      />

      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Wordmark className="scale-110" />
        <p className="text-sm text-textSecondary">خدمة التوصيل المحلية — المنيب</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-borderc bg-surfaceElevated p-6 shadow-sm sm:p-8">
        {returnTo && (
          <div className="alert alert-info mb-6">
            سجّل الدخول عشان تكمّل طلبك من نفس المكان اللي وقفت فيه.
          </div>
        )}

        <h1 className="mb-5 text-lg font-bold">تسجيل الدخول</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="phone">رقم الهاتف</label>
            <div className="relative">
              <Icon name="account" size={17} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-textSecondary" />
              <input
                id="phone" className="input pr-10" inputMode="numeric" placeholder="01xxxxxxxxx"
                value={phone} onChange={(e) => setPhone(e.target.value)} required
              />
            </div>
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

        <p className="mt-5 text-center text-sm text-textSecondary">
          نسيت كلمة المرور؟{" "}
          <ContactSupportLink
            label="تواصل معانا لإعادة تعيينها"
            message="مرحبًا، نسيت كلمة مرور حسابي في المنيب جو وعايز أعيد تعيينها."
          />
        </p>

        <div className="my-5 h-px bg-borderc" />

        <p className="text-center text-sm">
          ليس لديك حساب؟{" "}
          <Link href={returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register"} className="font-medium text-accent underline underline-offset-2">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </main>
  );
}
