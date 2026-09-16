"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "./Badge";
import Icon from "./Icon";

type Proof = {
  id: string;
  image_url: string;
  sender_name: string | null;
  sender_number: string | null;
  status: "pending" | "verified" | "rejected";
};

export default function PaymentProofPanel({ proof }: { proof: Proof }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReview(approve: boolean) {
    setLoading(true);
    await supabase.rpc("review_payment_proof", { p_proof_id: proof.id, p_approve: approve, p_notes: null });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="card">
      <h2 className="mb-3 flex items-center gap-2 font-medium">
        <Icon name="wallet" size={17} className="text-textSecondary" /> إثبات التحويل
        <Badge variant={proof.status === "verified" ? "success" : proof.status === "rejected" ? "error" : "warning"}>
          {proof.status === "verified" ? "تم التأكيد" : proof.status === "rejected" ? "مرفوض" : "بانتظار المراجعة"}
        </Badge>
      </h2>

      <a href={proof.image_url} target="_blank" rel="noreferrer">
        <Image src={proof.image_url} alt="إثبات التحويل" width={200} height={260} className="rounded-md border border-borderc object-cover" />
      </a>

      <div className="mt-3 space-y-1 text-sm">
        <p>الاسم: <span className="font-medium">{proof.sender_name || "—"}</span></p>
        <p>الرقم: <span className="numeric font-medium">{proof.sender_number || "—"}</span></p>
      </div>

      {proof.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => handleReview(true)} disabled={loading} className="btn-primary">تأكيد الاستلام</button>
          <button onClick={() => handleReview(false)} disabled={loading} className="btn-secondary text-error">رفض</button>
        </div>
      )}
    </div>
  );
}
