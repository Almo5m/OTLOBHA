import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import CustomerNav from "@/components/CustomerNav";
import OrderTimeline from "@/components/OrderTimeline";
import { OrderStatusBadge } from "@/components/Badge";
import PollRefresher from "@/components/PollRefresher";
import SuccessIllustration from "@/components/illustrations/SuccessIllustration";
import Icon from "@/components/Icon";
import { CancelOrderButton, CopyLinkButton, RatingForm } from "@/components/CustomerOrderActions";
import { toInternationalEgyptPhone } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "متابعة طلبك", robots: { index: false, follow: false } };

const METHOD_LABEL: Record<string, string> = { cash: "كاش عند الاستلام", wallet: "محفظة إلكترونية", instapay: "InstaPay" };
const FINAL = ["delivered", "canceled_by_customer", "canceled_by_business"];

export default async function TrackOrderPage({
  params, searchParams
}: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  const { new: isNew } = await searchParams;

  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc("get_order_by_token", { p_token: token });
  if (!data) notFound();
  const o: any = data;

  const canceled = String(o.status).startsWith("canceled");
  const total = o.invoice?.grand_total;

  return (
    <>
      <CustomerNav />
      {!FINAL.includes(o.status) && <PollRefresher />}
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-24 md:pb-6">
        {isNew && (
          <div className="card flex animate-fadeIn flex-col items-center gap-2 text-center">
            <div className="w-28"><SuccessIllustration /></div>
            <h1 className="text-lg font-bold">وصلنا طلبك يا {o.customer_name.split(" ")[0]}!</h1>
            <p className="text-sm text-textSecondary">
              أول ما حد من فريقنا يستلم طلبك هيبعتلك رسالة على واتساب. احفظ الصفحة دي عشان تتابع طلبك — الرابط ده هو الطريقة الوحيدة للرجوع للطلب.
            </p>
            <CopyLinkButton />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">طلب <span className="numeric">{o.order_number}</span></h2>
          <OrderStatusBadge status={o.status} />
        </div>

        <OrderTimeline status={o.status} />

        {canceled && o.cancellation_reason && (
          <p className="alert alert-error text-sm">السبب: {o.cancellation_reason}</p>
        )}

        {o.agent && !canceled && (
          <div className="card flex items-center justify-between gap-3 text-sm">
            <span>اتسلّم الطلب <b>{o.agent.name}</b></span>
            <a href={`https://wa.me/${toInternationalEgyptPhone(o.agent.whatsapp)}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1.5 text-sm">كلّمه واتساب</a>
          </div>
        )}

        <div className="card">
          <h3 className="mb-3 font-medium">الأصناف</h3>
          {(o.items as any[]).map((it, i) => {
            const unavailable = it.is_available === false;
            return (
              <div key={i} className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-borderc" : ""}`}>
                <div className={unavailable ? "opacity-50" : ""}>
                  <p className={unavailable ? "line-through" : ""}>{it.name}</p>
                  <p className="numeric text-xs text-textSecondary">
                    {it.target_price ? `بميزانية ${it.target_price} ج.م` : `${it.quantity} × ${it.unit}`}
                  </p>
                </div>
                {unavailable ? <span className="text-xs text-textSecondary">غير متوفر</span>
                  : it.actual_price != null ? <span className="numeric font-medium">{it.actual_price} ج.م</span> : null}
              </div>
            );
          })}
          <div className="mt-2 space-y-1 border-t border-borderc pt-3 text-sm">
            <div className="flex justify-between text-textSecondary"><span>رسوم التوصيل</span><span className="numeric">{o.delivery_fee} ج.م</span></div>
            {total != null && <div className="flex justify-between text-base font-bold"><span>الإجمالي</span><span className="numeric">{total} ج.م</span></div>}
          </div>
        </div>

        <div className="card space-y-1 text-sm text-textSecondary">
          <p className="flex items-start gap-2"><Icon name="location" size={16} className="mt-0.5 shrink-0" /> {o.address_text}</p>
          <p>الدفع: {METHOD_LABEL[o.payment_method]}</p>
          {o.customer_notes && <p>ملاحظاتك: {o.customer_notes}</p>}
        </div>

        {o.status === "new_order" && <CancelOrderButton token={token} />}

        {o.status === "delivered" && o.invoice?.image_url && (
          <div className="card space-y-3">
            <h3 className="font-medium">فاتورتك</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.invoice.image_url} alt="فاتورة الطلب" className="mx-auto w-full max-w-sm rounded-lg border border-borderc" />
            <a href={o.invoice.image_url} target="_blank" rel="noreferrer" className="btn-secondary w-full text-sm">فتح الفاتورة بالحجم الكامل</a>
          </div>
        )}

        {o.status === "delivered" && !o.rated && <RatingForm token={token} />}
        {o.status === "delivered" && o.rated && <p className="text-center text-sm text-success">شكرًا على تقييمك 🌿</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href={`/complaints?t=${token}`} className="text-textSecondary underline underline-offset-2">فيه مشكلة في الطلب؟ قدّم شكوى</Link>
          <Link href="/cart" className="text-accent underline underline-offset-2">اطلب تاني</Link>
        </div>
      </main>
    </>
  );
}
