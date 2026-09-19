"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * بيراقب جدول أو أكتر لحظيًا (Supabase Realtime)، وأي إضافة/تعديل/حذف
 * بيعمل router.refresh() فورًا — عشان أي صفحة قائمة (طلبات، منتجات،
 * عملاء...) تتحدث تلقائيًا لأي حد فاتحها من غير ما يحتاج يعمل Refresh يدوي.
 *
 * channelName لازم يكون مختلف لكل صفحة (زي "admin-orders-list") عشان
 * منقعش في تعارض بين قنوات مختلفة بنفس الاسم.
 */
export default function RealtimeRefresher({ tables, channelName }: { tables: string[]; channelName: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => router.refresh()
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, tables.join(",")]);

  return null;
}
