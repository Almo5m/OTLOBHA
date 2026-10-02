"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import { Badge } from "@/components/Badge";
import { toWesternDigits } from "@/lib/format/digits";

const ROLES = [
  { value: "delivery_agent", label: "مندوب" },
  { value: "business_admin", label: "أدمن" },
  { value: "super_admin", label: "سوبر أدمن" }
];

type Staff = { id: string; full_name: string; phone: string; role: string; status: string };

async function call(method: "POST" | "PATCH", body: object) {
  const res = await fetch("/api/staff", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return res.ok ? null : (json.error as string) ?? "حصلت مشكلة";
}

export default function StaffManager({ staff, currentUserId }: { staff: Staff[]; currentUserId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", phone: "", role: "delivery_agent", password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function run(fn: () => Promise<string | null>, okText: string) {
    setBusy(true); setMessage(null);
    const err = await fn();
    setBusy(false);
    if (err) { setMessage({ type: "err", text: err }); return false; }
    setMessage({ type: "ok", text: okText });
    router.refresh();
    return true;
  }

  async function create() {
    const ok = await run(() => call("POST", { ...form, phone: toWesternDigits(form.phone) }), "تم إنشاء الحساب — ادّي الموظف رقمه وكلمة المرور");
    if (ok) setForm({ full_name: "", phone: "", role: "delivery_agent", password: "" });
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="font-medium">إضافة موظف جديد</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="الاسم" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="input" dir="ltr" inputMode="tel" placeholder="رقم الموبايل (بيدخل بيه)" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: toWesternDigits(e.target.value) })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="كلمة مرور مؤقتة (8 أحرف+)" />
        </div>
        <button onClick={create} disabled={busy} className="btn-primary">إنشاء الحساب</button>
        {message && <p className={`text-sm ${message.type === "ok" ? "text-success" : "text-error"}`}>{message.text}</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surfaceElevated text-right">
            <tr><th className="px-3 py-2">الاسم</th><th className="px-3 py-2">الموبايل</th><th className="px-3 py-2">الدور</th><th className="px-3 py-2">الحالة</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {staff.map((u) => {
              const self = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-t border-borderc">
                  <td className="px-3 py-2">{u.full_name || "—"}</td>
                  <td className="numeric px-3 py-2" dir="ltr">{u.phone}</td>
                  <td className="px-3 py-2">
                    <select className="rounded-sm border border-line bg-surface px-2 py-1 text-sm" value={u.role} disabled={busy || self}
                      onChange={(e) => { if (confirm("تأكيد تغيير الدور؟")) run(() => call("PATCH", { user_id: u.id, action: "set_role", role: e.target.value }), "تم تغيير الدور"); }}>
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><Badge variant={u.status === "active" ? "success" : "error"}>{u.status === "active" ? "نشط" : "موقوف"}</Badge></td>
                  <td className="space-x-3 space-x-reverse px-3 py-2 text-xs">
                    {!self && (
                      <button className="text-accent underline underline-offset-2" disabled={busy}
                        onClick={() => run(() => call("PATCH", { user_id: u.id, action: "set_status", status: u.status === "active" ? "blocked" : "active" }), "تم تحديث الحالة")}>
                        {u.status === "active" ? "إيقاف" : "تفعيل"}
                      </button>
                    )}
                    <button className="text-accent underline underline-offset-2" disabled={busy}
                      onClick={() => {
                        const pw = prompt("اكتب كلمة المرور الجديدة (8 أحرف على الأقل)");
                        if (pw) run(() => call("PATCH", { user_id: u.id, action: "set_password", password: pw }), "تم تغيير كلمة المرور");
                      }}>
                      كلمة مرور جديدة
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
