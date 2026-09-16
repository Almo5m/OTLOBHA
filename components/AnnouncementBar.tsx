"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";

export default function AnnouncementBar() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("platform_settings").select("key,value").in("key", ["announcement_bar_enabled", "announcement_bar_text"])
      .then(({ data }) => {
        const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
        if (settings.announcement_bar_enabled && settings.announcement_bar_text) {
          setText(settings.announcement_bar_text);
        }
      });
  }, []);

  if (!text) return null;

  return (
    <div className="border-b border-borderc bg-accent-soft px-4 py-2 text-center text-sm text-accent-strong">
      <span className="inline-flex items-center gap-1.5">
        <Icon name="notifications" size={14} />
        {text}
      </span>
    </div>
  );
}
