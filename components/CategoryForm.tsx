"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ImageUploadField from "./ImageUploadField";

export default function CategoryForm() {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.name.trim()) { setError("اسم التصنيف مطلوب"); return; }
    setLoading(true);
    const { error } = await supabase.from("categories").insert({
      name: form.name, description: form.description, image_url: form.imageUrl || null
    });
    setLoading(false);
    if (error) { setError("هذه العملية تتطلب صلاحية Super Admin: " + error.message); return; }
    setForm({ name: "", description: "", imageUrl: "" });
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-medium">إضافة تصنيف جديد</h2>
      <input className="input" placeholder="اسم التصنيف" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <textarea className="input" placeholder="وصف اختياري" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <ImageUploadField purpose="catalog" onUploaded={(url) => setForm({ ...form, imageUrl: url })} />
      {error && <p className="text-sm text-error">{error}</p>}
      <button onClick={handleSubmit} disabled={loading} className="btn-primary">إضافة</button>
    </div>
  );
}
