"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** الزائر مفيش له Realtime (محتاج صلاحيات) — فبنعمل تحديث دوري خفيف وبس والتبويب ظاهر. */
export default function PollRefresher({ everyMs = 15000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const id = setInterval(tick, everyMs);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [router, everyMs]);
  return null;
}
