// Supabase Edge Function — إرسال Push Notification فعلي عبر web-push
// يُفعَّل هذا عبر Database Webhook على جدول notification_log عند
// INSERT بقيمة channel = 'push'. راجع README لخطوات الربط.
//
// deno-lint-ignore-file no-explicit-any
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  "mailto:support@otlobha.example",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async (req) => {
  const payload = await req.json();
  const record = payload.record; // صف notification_log الجديد

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const subsRes = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${record.recipient_id}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const subs = await subsRes.json();

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title: "اطلبها", body: record.payload?.text ?? "لديك تحديث جديد" })
      );
    } catch (e) {
      console.error("push failed", e);
    }
  }

  return new Response("ok");
});
