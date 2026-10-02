"use client";

import { useMemo, useState } from "react";
import InvoiceSender from "./InvoiceSender";
import { formatInvoiceDate } from "@/lib/invoice/format";

export type InvoiceRow = {
  id: string; invoice_number: string; grand_total: number; created_at: string; image_url: string | null;
  send_count: number; last_sent_at: string | null;
  order_id: string; order_number: string; customer_name: string; customer_phone: string; tracking_token: string;
};

/** أرشيف الفواتير: بحث برقم العميل/اسمه/رقم الفاتورة، وإعادة إرسال أي فاتورة قديمة. */
export default function InvoicesBrowser({ rows, invoiceTemplate }: { rows: InvoiceRow[]; invoiceTemplate: string | null }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.customer_phone.includes(q) || r.customer_name.toLowerCase().includes(q) ||
      r.invoice_number.toLowerCase().includes(q) || r.order_number.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <input className="input" placeholder="ابحث برقم العميل أو اسمه أو رقم الفاتورة..." value={query} onChange={(e) => setQuery(e.target.value)} />
      {filtered.length === 0 && <p className="card text-sm text-textSecondary">مفيش فواتير مطابقة.</p>}
      {filtered.map((r) => (
        <div key={r.id} className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{r.customer_name} — <span className="numeric" dir="ltr">{r.customer_phone}</span></p>
              <p className="numeric text-xs text-textSecondary">
                {r.invoice_number} · {r.order_number} · {formatInvoiceDate(r.created_at)}
                {r.send_count > 0 && <> · اتبعتت {r.send_count} مرة</>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="numeric text-lg font-bold">{r.grand_total} ج.م</span>
              <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                {openId === r.id ? "إخفاء" : "عرض / إرسال"}
              </button>
            </div>
          </div>
          {openId === r.id && (
            <InvoiceSender invoiceId={r.id} orderId={r.order_id} imageUrl={r.image_url}
              invoiceTemplate={invoiceTemplate} trackingToken={r.tracking_token} />
          )}
        </div>
      ))}
    </div>
  );
}
