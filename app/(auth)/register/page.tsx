"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Wordmark from "@/components/Wordmark";

const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ fullName: "", phone: "", address: "", password: "" });
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

    setLoading(true);
    // ملاحظة تصميم: لا يوجد Phone OTP (بدون ميزانية)، لذلك نستخدم مصادقة
    // Supabase القياسية بالبريد/كلمة مرور، مع بريد داخلي مبني من رقم
    // الهاتف (غير ظاهر للمستخدم إطلاقًا) — رقم الهاتف نفسه محفوظ ومُتحقق
    // منه في جدول public.users وهو ما يُستخدم في كل الشاشات والرسائل.
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

    // إنشاء العنوان الأساسي
    if (form.address.trim()) {
      await supabase.from("addresses").insert({
        customer_id: data.user.id,
        label: "العنوان الأساسي",
        full_address_text: form.address,
        is_default: true
      });
    }

    setLoading(false);
    router.push("/home");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-1"><Wordmark /></div>
      <p className="mb-1 mt-3 text-lg font-bold">إنشاء حساب جديد</p>
      <p className="mb-8 text-sm text-textSecondary">للطلب من «اطلبها» — خدمة داخل المنيب حاليًا</p>

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
          <input type="password" className="input" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>
    </main>
  );
}
