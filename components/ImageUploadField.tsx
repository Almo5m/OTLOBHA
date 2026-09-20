"use client";

import { useState } from "react";
import type { UploadPurpose } from "@/lib/cloudinary/sign";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function ImageUploadField({
  purpose, onUploaded
}: {
  purpose: UploadPurpose;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("الصيغ المسموحة: JPG أو PNG أو WEBP");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("حجم الصورة يجب ألا يتجاوز 5 ميجا");
      return;
    }

    setUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose })
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error ?? "تعذّر تجهيز الرفع");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sign.apiKey);
      formData.append("timestamp", sign.timestamp);
      formData.append("signature", sign.signature);
      formData.append("folder", sign.folder);
      formData.append("allowed_formats", sign.allowed_formats);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });
      const uploaded = await uploadRes.json();
      if (!uploaded.secure_url) throw new Error("فشل رفع الصورة");

      setPreview(uploaded.secure_url);
      onUploaded(uploaded.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="label">الصورة</label>
      <input type="file" accept={ACCEPTED_TYPES.join(",")} onChange={handleFile} className="input" />
      {uploading && <p className="mt-1 text-xs text-textSecondary">جارٍ الرفع...</p>}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      {preview && <img src={preview} alt="" className="mt-2 h-20 w-20 rounded-sm object-cover" />}
    </div>
  );
}
