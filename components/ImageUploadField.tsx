"use client";

import { useState } from "react";

export default function ImageUploadField({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const signRes = await fetch("/api/cloudinary-sign", { method: "POST" });
    const sign = await signRes.json();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sign.apiKey);
    formData.append("timestamp", sign.timestamp);
    formData.append("signature", sign.signature);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });
    const uploaded = await uploadRes.json();
    setUploading(false);

    if (uploaded.secure_url) {
      setPreview(uploaded.secure_url);
      onUploaded(uploaded.secure_url);
    }
  }

  return (
    <div>
      <label className="label">الصورة</label>
      <input type="file" accept="image/*" onChange={handleFile} className="input" />
      {uploading && <p className="mt-1 text-xs text-textSecondary">جارٍ الرفع...</p>}
      {preview && <img src={preview} alt="" className="mt-2 h-20 w-20 rounded-sm object-cover" />}
    </div>
  );
}
