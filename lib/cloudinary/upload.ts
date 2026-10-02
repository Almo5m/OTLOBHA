"use client";

import type { UploadPurpose } from "./sign";

/** يرفع Blob/File على Cloudinary بتوقيع من السيرفر ويرجّع الرابط الآمن. */
export async function uploadToCloudinary(file: Blob, purpose: UploadPurpose, filename = "upload.jpg"): Promise<string> {
  const signRes = await fetch("/api/cloudinary-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose })
  });
  const sign = await signRes.json().catch(() => ({}));
  if (!signRes.ok) throw new Error(sign.error ?? "تعذّر تجهيز الرفع");

  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("api_key", sign.apiKey);
  formData.append("timestamp", sign.timestamp);
  formData.append("signature", sign.signature);
  formData.append("folder", sign.folder);
  formData.append("allowed_formats", sign.allowed_formats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: "POST", body: formData });
  const uploaded = await res.json().catch(() => ({}));
  if (!uploaded.secure_url) throw new Error("فشل رفع الصورة");
  return uploaded.secure_url as string;
}
