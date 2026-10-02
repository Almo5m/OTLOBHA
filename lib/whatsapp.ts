// أدوات واتساب: كل الرسائل بتتبعت يدويًا (Click-to-Chat) من موبايل الإداري —
// مفيش API مدفوع. الرابط بيفتح شات العميل والرسالة جاهزة.

/** 01012345678 → 201012345678 (الصيغة الدولية اللي wa.me بيطلبها) */
export function toInternationalEgyptPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "20" + digits.slice(1);
  return digits;
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${toInternationalEgyptPhone(phone)}?text=${encodeURIComponent(text)}`;
}

/** بيستبدل {{variable}} بقيمته، وأي متغير ملهوش قيمة بيتشال بدل ما يظهر للعميل كما هو */
export function fillTemplate(body: string, vars: Record<string, string | number | null | undefined>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

export function trackingUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/order/${token}`;
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
