"use client";

import { fillTemplate, trackingUrl, waLink } from "@/lib/whatsapp";

/** زرار يفتح شات العميل على واتساب برسالة جاهزة من قالب (الإرسال يدوي). */
export default function WhatsAppMessageButton({
  phone, template, vars, trackingToken, label
}: {
  phone: string;
  template: string | null;
  vars: Record<string, string | number | null | undefined>;
  trackingToken: string;
  label: string;
}) {
  if (!template) return null;
  return (
    <button
      type="button"
      className="btn-secondary text-sm"
      onClick={() => {
        const text = fillTemplate(template, { ...vars, tracking_link: trackingUrl(window.location.origin, trackingToken) });
        window.open(waLink(phone, text), "_blank");
      }}
    >
      {label}
    </button>
  );
}
