"use client";

// معرّف عشوائي بيتحفظ في المتصفح — بيستخدمه السيرفر كواحد من حدود الحماية من السبام.
// مش بديل عن حساب: لو العميل مسحه هيتولّد جديد، فالحدود الأساسية بتتحسب كمان بالرقم.
const KEY = "mg_device_id";

export function getDeviceId(): string | null {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}
