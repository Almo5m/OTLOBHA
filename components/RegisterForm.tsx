"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Wordmark from "@/components/Wordmark";
import PasswordInput from "@/components/PasswordInput";

const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const returnTo = useSearchParams().get("returnTo");
  const [form, setForm] = useState({ fullName: "", phone: "", address: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!EGYPT_PHONE_REGEX.test(form.phone)) {
      setError("صيغة رقم الهاتف غير صحيحة، يجب أن يكون رقمًا مصريًا صحيحًا");
      return;
    }
    if (form.password.length < 8) {
      setError("كلمة المرور يجب ألا تقل عن 8 أحرف");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين، يرجى المحاولة مرة أخرى");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: `${form.phone}@otlobha.local`,
      password: form.password,
      options: { data: { phone: form.phone, full_name: form.fullName } }
    });

    if (signUpError || !data.user) {
      setLoading(false);
      setError(signUpError?.message.includes("registered")
        ? "هذا الرقم مسجّل بالفعل"
        : "حدث خطأ أثناء إنشاء الحساب");
      return;
    }

    if (form.address.trim()) {
      await supabase.from("addresses").insert({
        customer_id: data.user.id,
        label: "العنوان الأساسي",
        full_address_text: form.address,
        is_default: true
      });
    }

    setLoading(false);
    router.push(returnTo || "/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-1"><Wordmark /></div>
      <p className="mb-1 mt-3 text-lg font-bold">إنشاء حساب جديد</p>
      <p className="mb-8 text-sm text-textSecondary">
        {returnTo ? "خطوة أخيرة بسيطة عشان تكمّل طلبك" : "للطلب من «اطلبها» — خدمة داخل المنيب حاليًا"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">الاسم</label>
          <input className="input" required value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label className="label">رقم الهاتف</label>
          <input className="input" inputMode="numeric" placeholder="01xxxxxxxxx" required
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">العنوان الأساسي</label>
          <textarea className="input" rows={2} required value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" required />
        </div>
        <div>
          <label className="label">تأكيد كلمة المرور</label>
          <PasswordInput value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} autoComplete="new-password" required />
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>
    </main>
  );
}
