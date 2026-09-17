"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";

export default function PerksAlert() {
  const [perks, setPerks] = useState<{ kind: string; label: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("get_active_perks").then(({ data }) => setPerks(data ?? []));
  }, []);

  if (perks.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {perks.map((p, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border-2 border-accent bg-accent-soft px-4 py-3 text-sm font-medium text-accent-strong">
          <Icon name={p.kind === "discount" ? "wallet" : "rating"} size={17} className="shrink-0" />
          {p.label}
        </div>
      ))}
    </div>
  );
}
