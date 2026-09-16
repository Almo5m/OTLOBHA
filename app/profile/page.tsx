"use client";

import { useEffect, useState } from "react";
import CustomerNav from "@/components/CustomerNav";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [fullName, setFullName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [outstandingDebt, setOutstandingDebt] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
      setProfile(data);
      setFullName(data?.full_name ?? "");
      const { data: addrs } = await supabase.from("addresses").select("*").eq("customer_id", user.id);
      setAddresses(addrs ?? []);
      const { data: debts } = await supabase.from("debts").select("amount,status").eq("customer_id", user.id).neq("status", "settled");
      setOutstandingDebt((debts ?? []).reduce((s, d) => s + Number(d.amount), 0));
    })();
  }, []);

  async function handleSave() {
    if (!profile) return;
    await supabase.from("users").update({ full_name: fullName }).eq("id", profile.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleAddAddress() {
    if (!newAddress.trim() || !profile) return;
    const { data } = await supabase.from("addresses").insert({
      customer_id: profile.id, label: "عنوان إضافي", full_address_text: newAddress
    }).select().single();
    setAddresses([...addresses, data]);
    setNewAddress("");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!profile) return null;

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:pb-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon name="account" size={20} className="text-textSecondary" /> حسابي</h1>

        <div className="card mb-4 space-y-3">
          <div>
            <label className="label">الاسم</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">رقم الهاتف</label>
            <input className="input bg-line/20" value={profile.phone} disabled />
          </div>
          <button onClick={handleSave} className="btn-primary">{saved ? "تم الحفظ ✓" : "حفظ التعديلات"}</button>
        </div>

        <div className="card mb-4">
          <h2 className="mb-3 font-medium">العناوين المحفوظة</h2>
          <div className="space-y-2 text-sm">
            {addresses.map((a) => (
              <p key={a.id}>{a.label}: {a.full_address_text} {a.is_default && "(أساسي)"}</p>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input className="input" placeholder="عنوان جديد" value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)} />
            <button onClick={handleAddAddress} className="btn-secondary shrink-0">إضافة</button>
          </div>
        </div>

        <Link href="/debts" className="card mb-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-textSecondary">
            <Icon name="debt" size={16} /> المديونية
          </span>
          <span className="numeric font-medium">
            {outstandingDebt > 0 ? `${outstandingDebt.toFixed(2)} ج.م` : "لا يوجد"}
          </span>
        </Link>

        <button onClick={handleLogout} className="text-sm text-error">تسجيل الخروج</button>
      </main>
    </>
  );
}
