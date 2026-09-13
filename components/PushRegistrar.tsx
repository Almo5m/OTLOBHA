"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushRegistrar() {
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const registration = await navigator.serviceWorker.register("/sw.js");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sub = subscription.toJSON();
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        keys: sub.keys
      }, { onConflict: "endpoint" });
    })();
  }, []);

  return null;
}
