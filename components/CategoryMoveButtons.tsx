"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "./Icon";

export default function CategoryMoveButtons({
  categoryId, sortOrder, prevSibling, nextSibling
}: {
  categoryId: string;
  sortOrder: number;
  prevSibling: { id: string; sort_order: number } | null;
  nextSibling: { id: string; sort_order: number } | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function swapWith(sibling: { id: string; sort_order: number }) {
    setLoading(true);
    await Promise.all([
      supabase.from("categories").update({ sort_order: sibling.sort_order }).eq("id", categoryId),
      supabase.from("categories").update({ sort_order: sortOrder }).eq("id", sibling.id)
    ]);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => prevSibling && swapWith(prevSibling)}
        disabled={!prevSibling || loading}
        className="flex h-6 w-6 items-center justify-center rounded-sm text-textSecondary transition-colors duration-fast hover:bg-surfaceElevated disabled:opacity-30"
        title="تحريك لأعلى"
      >
        <Icon name="chevron" size={14} className="-rotate-90" />
      </button>
      <button
        onClick={() => nextSibling && swapWith(nextSibling)}
        disabled={!nextSibling || loading}
        className="flex h-6 w-6 items-center justify-center rounded-sm text-textSecondary transition-colors duration-fast hover:bg-surfaceElevated disabled:opacity-30"
        title="تحريك لأسفل"
      >
        <Icon name="chevron" size={14} className="rotate-90" />
      </button>
    </div>
  );
}
