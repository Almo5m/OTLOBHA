"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerNav from "@/components/CustomerNav";
import { OrderStatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import NoOrdersIllustration from "@/components/illustrations/NoOrdersIllustration";
import { createClient } from "@/lib/supabase/client";
import { readSavedOrders, type SavedOrder } from "@/lib/saved-orders";

type Row = SavedOrder & { status?: string; order_number?: string; missing?: boolean };

// مفيش حسابات: الطلبات اللي اتعملت من الجهاز ده بتتحفظ محليًا، وحالتها بتتجاب بالرابط الخاص بكل طلب.
export default function OrdersPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const saved = readSavedOrders();
    Promise.all(saved.map(async (s): Promise<Row> => {
      const { data } = await supabase.rpc("get_order_by_token", { p_token: s.token });
      return data ? { ...s, status: (data as any).status, order_number: (data as any).order_number } : { ...s, missing: true };
    })).then((r) => setRows(r.filter((x) => !x.missing)));
  }, []);

  return (
    <>
      <CustomerNav />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 md:max-w-3xl md:pb-6">
        <h1 className="mb-1 text-xl font-bold">طلباتي</h1>
        <p className="mb-4 text-xs text-textSecondary">الطلبات اللي عملتها من الجهاز ده. أي طلب تاني هتلاقي رابطه في رسالة واتساب.</p>
        {rows === null ? (
          <p className="animate-pulseSoft text-sm text-textSecondary">جارٍ التحميل...</p>
        ) : rows.length === 0 ? (
          <EmptyState illustration={<NoOrdersIllustration />} title="لسه معملتش أي طلب من الجهاز ده"
            description="اكتب طلبك وهيظهر هنا" action={<Link href="/cart" className="btn-primary">اطلب دلوقتي</Link>} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((o) => (
              <Link key={o.token} href={`/order/${o.token}`} className="card card-interactive flex animate-fadeIn items-center justify-between">
                <div>
                  <p className="numeric font-medium">{o.order_number}</p>
                  <p className="text-xs text-textSecondary">{new Date(o.createdAt).toLocaleString("ar-EG")}</p>
                </div>
                {o.status && <OrderStatusBadge status={o.status} />}
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
