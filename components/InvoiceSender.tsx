"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { renderInvoiceToBlob } from "@/lib/invoice/render";
import { toInvoiceLines, formatMoney, type InvoiceData } from "@/lib/invoice/format";
import { uploadToCloudinary } from "@/lib/cloudinary/upload";
import { fillTemplate, trackingUrl, waLink } from "@/lib/whatsapp";
import Icon from "./Icon";

type Props = {
  invoiceId: string;
  orderId: string;
  imageUrl: string | null;
  invoiceTemplate: string | null;
  trackingToken: string;
};

/**
 * إرسال الفاتورة للعميل:
 * 1) أول ما تتفتح بنجهّز صورة الفاتورة (من الداتابيز → Canvas → Cloudinary) لو لسه متعملتش،
 *    أو بننزّلها لو متخزنة، وبنسيبها جاهزة في الذاكرة.
 * 2) الضغط على "إرسال" بيفتح قائمة المشاركة بالصورة (لازم الضغطة تكون مباشرة بدون await قبلها
 *    عشان iOS يسمح) — والإداري يختار شات العميل. وفيه زرار تاني يفتح شات العميل بالرابط مباشرة.
 */
export default function InvoiceSender({ invoiceId, orderId, imageUrl: initialUrl, invoiceTemplate, trackingToken }: Props) {
  const supabase = createClient();
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(initialUrl);
  const [phase, setPhase] = useState<"preparing" | "ready" | "error">("preparing");
  const [message, setMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ name: string; phone: string; orderNumber: string; total: number } | null>(null);
  const started = useRef(false);

  const prepare = useCallback(async () => {
    setPhase("preparing");
    setMessage(null);
    try {
      const [{ data: inv, error: invErr }, { data: items }] = await Promise.all([
        supabase.from("invoices")
          .select("*, orders!inner(order_number,customer_name,customer_phone,address_text,payment_method,assigned_agent_id)")
          .eq("id", invoiceId).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("created_at")
      ]);
      if (invErr || !inv) throw new Error("تعذّر تحميل الفاتورة");
      const order: any = inv.orders;
      setCustomer({ name: order.customer_name, phone: order.customer_phone, orderNumber: order.order_number, total: Number(inv.grand_total) });

      let finalBlob: Blob | null = null;
      let url: string | null = inv.image_url ?? null;

      if (url) {
        // مخزّنة بالفعل: ننزّلها عشان نقدر نشاركها كملف
        const res = await fetch(url);
        if (res.ok) finalBlob = await res.blob();
      }

      if (!finalBlob) {
        let agentName: string | null = null;
        if (order.assigned_agent_id) {
          const { data: agent } = await supabase.from("users").select("full_name").eq("id", order.assigned_agent_id).maybeSingle();
          agentName = agent?.full_name ?? null;
        }
        const { data: settings } = await supabase.from("platform_settings").select("key,value")
          .in("key", ["brand_name", "invoice_footer_text"]);
        const s = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value]));

        const data: InvoiceData = {
          brandName: typeof s.brand_name === "string" && s.brand_name ? s.brand_name : "المنيب جو",
          invoiceNumber: inv.invoice_number,
          orderNumber: order.order_number,
          dateIso: inv.created_at,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          address: order.address_text,
          agentName,
          paymentMethod: inv.payment_method,
          lines: toInvoiceLines((items ?? []) as any),
          itemsTotal: Number(inv.items_total),
          deliveryFee: Number(inv.delivery_fee),
          grandTotal: Number(inv.grand_total),
          footerText: typeof s.invoice_footer_text === "string" && s.invoice_footer_text ? s.invoice_footer_text : "شكرًا لثقتكم"
        };
        finalBlob = await renderInvoiceToBlob(data);

        // نخزّنها على Cloudinary عشان تتبعت تاني بعدين من صفحة الفواتير
        url = await uploadToCloudinary(finalBlob, "invoice", `${inv.invoice_number}.jpg`);
        const { error: saveErr } = await supabase.rpc("set_invoice_image", { p_invoice_id: invoiceId, p_url: url });
        if (saveErr) throw new Error(saveErr.message);
      }

      setBlob(finalBlob);
      setImageUrl(url);
      setPreviewSrc(URL.createObjectURL(finalBlob));
      setPhase("ready");
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : "حصلت مشكلة في تجهيز الفاتورة");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    prepare();
  }, [prepare]);

  function messageText() {
    const body = invoiceTemplate ?? "أهلاً {{customer_name}}، دي فاتورة طلبك رقم {{order_number}} — الإجمالي {{grand_total}} جنيه.\n{{invoice_link}}";
    return fillTemplate(body, {
      customer_name: customer?.name, order_number: customer?.orderNumber,
      grand_total: customer ? formatMoney(customer.total) : "",
      invoice_link: imageUrl ?? "",
      tracking_link: trackingUrl(window.location.origin, trackingToken)
    });
  }

  async function markSent() {
    await supabase.rpc("record_invoice_sent", { p_invoice_id: invoiceId });
  }

  async function shareImage() {
    if (!blob || !customer) return;
    setMessage(null);
    const file = new File([blob], `invoice-${customer.orderNumber}.jpg`, { type: "image/jpeg" });
    const text = messageText();

    if (navigator.canShare?.({ files: [file] })) {
      try {
        // مهم: navigator.share لازم يتنادى مباشرة من الضغطة — من غير await قبله
        await navigator.share({ files: [file], text });
        await markSent();
        setMessage("تم فتح المشاركة — اختار شات العميل وابعت ✔");
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;   // المستخدم قفل القائمة
      }
    }
    // المتصفح ميدعمش مشاركة الملفات (كمبيوتر مثلًا): ننزّل الصورة ونفتح شات العميل
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    a.click();
    setMessage("نزّلنا الصورة على جهازك — ابعتها للعميل من شات واتساب اللي اتفتح.");
    window.open(waLink(customer.phone, text), "_blank");
    await markSent();
  }

  async function openChat() {
    if (!customer) return;
    window.open(waLink(customer.phone, messageText()), "_blank");
    await markSent();
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-medium"><Icon name="invoice" size={17} className="text-textSecondary" /> فاتورة العميل</h2>

      {phase === "preparing" && <p className="animate-pulseSoft text-sm text-textSecondary">جارٍ تجهيز صورة الفاتورة...</p>}

      {phase === "error" && (
        <div className="space-y-2">
          <p className="alert alert-error text-sm">{message}</p>
          <button onClick={prepare} className="btn-secondary w-full">إعادة المحاولة</button>
        </div>
      )}

      {previewSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewSrc} alt="فاتورة الطلب" className="mx-auto w-full max-w-sm rounded-lg border border-borderc" />
      )}

      {phase === "ready" && (
        <div className="space-y-2">
          <button onClick={shareImage} className="btn-primary w-full">
            <Icon name="externalLink" size={16} /> إرسال الفاتورة على واتساب (صورة)
          </button>
          <button onClick={openChat} className="btn-secondary w-full text-sm">فتح شات العميل برابط الفاتورة</button>
          <p className="text-xs text-textSecondary">
            الزرار الأول بيفتح قائمة المشاركة بالصورة — اختار واتساب وبعدين العميل. الفاتورة محفوظة وتقدر تبعتها تاني من صفحة «الفواتير».
          </p>
          {message && <p className="text-sm text-success">{message}</p>}
        </div>
      )}
    </div>
  );
}
