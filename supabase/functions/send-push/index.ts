// deno-lint-ignore-file no-explicit-any
import webpush from "npm:web-push@3.6.7";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT_LENGTH = 300;

webpush.setVapidDetails(
  "mailto:support@otlobha.example",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

function timingSafeEqual(a: string, b: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return difference === 0;
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get("SEND_PUSH_WEBHOOK_SECRET");
  if (!expectedSecret) return new Response("not configured", { status: 503 });

  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!timingSafeEqual(providedSecret, expectedSecret)) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const record = payload?.record;
  if (!record || record.channel !== "push" || !UUID_PATTERN.test(String(record.recipient_id ?? ""))) {
    return new Response("bad request", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const subsRes = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(record.recipient_id)}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const subs = subsRes.ok ? await subsRes.json() : [];
  if (!Array.isArray(subs)) return new Response("ok");

  const body = String(record.payload?.text ?? "لديك تحديث جديد").slice(0, MAX_TEXT_LENGTH);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title: "المنيب جو", body })
      );
    } catch (e) {
      console.error("push failed", e);
    }
  }

  return new Response("ok");
});
