// لوحات مفاتيح الأرقام العربية أو الفارسية بترجع رموز مختلفة عن الأرقام
// اللاتينية العادية (٠١٢٣... أو ۰۱۲۳...)، وحقول type="number" بترفض
// الرموز دي بصمت وتفضل فاضية أو صفر. الدالة دي بتحوّل أي رقم عربي/فارسي
// لرقم لاتيني عادي، عشان أي حقل نصي يقدر يتعامل مع الكيبورد بأي لغة.
const ARABIC_INDIC_OFFSET = 0x0660; // ٠..٩
const EXTENDED_ARABIC_INDIC_OFFSET = 0x06f0; // ۰..۹

export function toWesternDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const offset = code >= EXTENDED_ARABIC_INDIC_OFFSET ? EXTENDED_ARABIC_INDIC_OFFSET : ARABIC_INDIC_OFFSET;
    return String(code - offset);
  });
}

// بتسمح برقم واحد بس (أو فاضي مؤقتًا وقت الكتابة) — بتشيل أي حرف غير رقم
// أو نقطة، وبتخلي نقطة عشرية واحدة بس مهما كتب المستخدم أكتر من واحدة
export function sanitizeNumericInput(value: string) {
  const western = toWesternDigits(value);
  const digitsAndDot = western.replace(/[^\d.]/g, "");
  const firstDot = digitsAndDot.indexOf(".");
  if (firstDot === -1) return digitsAndDot;
  return digitsAndDot.slice(0, firstDot + 1) + digitsAndDot.slice(firstDot + 1).replace(/\./g, "");
}
