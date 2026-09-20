import { createClient } from "@/lib/supabase/client";

export async function recordSession() {
  const supabase = createClient();
  const deviceInfo = typeof navigator !== "undefined" ? navigator.userAgent : null;
  await supabase.rpc("record_session", { p_device_info: deviceInfo });
}
