import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { homeFor, type AppRole } from "@/lib/auth/roles";

export async function requireRole(allowedRoles: AppRole[]) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role,status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/blocked");
  if (!allowedRoles.includes(profile.role as AppRole)) redirect(homeFor(profile.role));
}
