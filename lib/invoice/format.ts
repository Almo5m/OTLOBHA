// دوال بحتة (من غير DOM) خاصة بالفاتورة — متغطّاة باختبارات.

export type InvoiceLine = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;   // سعر الوحدة (null = غير متوفر)
  lineTotal: number;
  available: boolean;
};

export type InvoiceData = {
  brandName: string;
  invoiceNumber: string;
  orderNumber: string;
  dateIso: string;
  customerName: string;
  customerPhone: string;
  address: string;
  agentName: string | null;
  paymentMethod: "cash" | "wallet" | "instapay";
  lines: InvoiceLine[];
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
  footerText: string;
};

export const PAYMENT_LABEL: Record<InvoiceData["paymentMethod"], string> = {
  cash: "كاش عند الاستلام",
  wallet: "محفظة إلكترونية",
  instapay: "InstaPay"
};

/** 1234.5 → "1,234.5" — أرقام لاتينية دايمًا عشان تتقري بوضوح على أي جهاز */
export function formatMoney(value: number) {
  const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  return rounded.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatQuantity(value: number) {
  return (Math.round(value * 1000) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export function formatInvoiceDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    timeZone: "Africa/Cairo", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
}

/** يحوّل صفوف invoice_items (من الداتابيز) لسطور الفاتورة. */
export function toInvoiceLines(rows: {
  product_name: string; quantity: number | string; unit_name: string;
  actual_price: number | string | null; line_total: number | string; is_available: boolean;
}[]): InvoiceLine[] {
  return rows.map((r) => {
    const qty = Number(r.quantity);
    const total = Number(r.line_total);
    const hasPrice = r.is_available && r.actual_price !== null;
    return {
      name: r.product_name,
      quantity: qty,
      unit: r.unit_name,
      // لو الصنف بالميزانية (الوحدة "بالميزانية") السعر هو المبلغ المدفوع نفسه
      unitPrice: hasPrice ? Number(r.actual_price) : null,
      lineTotal: r.is_available ? total : 0,
      available: r.is_available
    };
  });
}

/** يقسّم نص لسطور بحيث كل سطر مقاسه ≤ maxWidth حسب دالة قياس. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  // كلمة واحدة أطول من العرض كله → نقطّعها بالحروف
  return lines.flatMap((line) => {
    if (measure(line) <= maxWidth) return [line];
    const chunks: string[] = [];
    let part = "";
    for (const ch of Array.from(line)) {
      if (measure(part + ch) > maxWidth && part) { chunks.push(part); part = ch; } else { part += ch; }
    }
    if (part) chunks.push(part);
    return chunks;
  });
}
