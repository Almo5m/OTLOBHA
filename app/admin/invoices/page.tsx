import { createServerSupabase } from "@/lib/supabase/server";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import SearchEmptyIllustration from "@/components/illustrations/SearchEmptyIllustration";
import InvoicesBrowser, { type InvoiceRow } from "@/components/InvoicesBrowser";

export default async function AdminInvoicesPage() {
  const supabase = await createServerSupabase();
  const [{ data: invoices }, { data: tpl }] = await Promise.all([
    supabase.from("invoices")
      .select("id,invoice_number,grand_total,created_at,image_url,send_count,last_sent_at,order_id,orders!inner(order_number,customer_name,customer_phone,tracking_token)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("whatsapp_templates").select("body_text").eq("event_key", "invoice_sent").eq("is_active", true).maybeSingle()
  ]);

  const rows: InvoiceRow[] = (invoices ?? []).map((i: any) => ({
    id: i.id, invoice_number: i.invoice_number, grand_total: Number(i.grand_total), created_at: i.created_at,
    image_url: i.image_url, send_count: i.send_count, last_sent_at: i.last_sent_at, order_id: i.order_id,
    order_number: i.orders.order_number, customer_name: i.orders.customer_name,
    customer_phone: i.orders.customer_phone, tracking_token: i.orders.tracking_token
  }));

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Icon name="invoice" size={20} className="text-textSecondary" /> الفواتير
        </h1>
        {rows.length === 0
          ? <EmptyState illustration={<SearchEmptyIllustration />} title="لا توجد فواتير بعد" description="الفاتورة بتتعمل أوتوماتيك أول ما طلب يتسلّم" />
          : <InvoicesBrowser rows={rows} invoiceTemplate={tpl?.body_text ?? null} />}
      </main>
    </>
  );
}
