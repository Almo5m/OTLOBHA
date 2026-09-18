"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * بيراقب صف الطلب ده في الداتابيز لحظيًا (Supabase Realtime)، وأي تحديث
 * (زي تغيير الحالة من لوحة التحكم) بيعمل router.refresh() فورًا بدل ما
 * العميل يحتاج يعمل Refresh يدوي عشان يشوف آخر حالة.
 */
export default function OrderRealtimeRefresher({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  return null;
}
