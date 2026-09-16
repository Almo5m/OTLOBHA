"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("كلمة المرور يجب ألا تقل عن 8 أحرف"); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }

    setLoading(true);
    const { error } = await supabase.rpc("confirm_password_reset", { p_token: token, p_new_password: password });
    setLoading(false);
    if (error) { setError("الرابط غير صالح أو منتهي الصلاحية"); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return <p className="text-center text-sm text-error">رابط غير صالح.</p>;
  }

  return (
    <>
      <h1 className="mb-6 text-xl font-bold text-textPrimary">إعادة تعيين كلمة المرور</h1>
      {done ? (
        <p className="text-sm text-primary">تم تعيين كلمة المرور بنجاح، سيتم تحويلك لتسجيل الدخول...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">كلمة المرور الجديدة</label>
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" required />
          </div>
          <div>
            <label className="label">تأكيد كلمة المرور</label>
            <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" required />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "جارٍ الحفظ..." : "تعيين كلمة المرور"}
          </button>
        </form>
      )}
    </>
  );
}
