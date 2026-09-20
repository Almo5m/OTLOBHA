export type AppRole = "customer" | "delivery_agent" | "business_admin" | "super_admin";

export const ROLE_HOME: Record<AppRole, string> = {
  customer: "/home",
  delivery_agent: "/agent/dashboard",
  business_admin: "/admin/dashboard",
  super_admin: "/admin/dashboard"
};

const SUPER_ADMIN_ONLY_PREFIXES = ["/admin/settings", "/admin/categories", "/admin/reports"];

export function homeFor(role: string | null | undefined) {
  return ROLE_HOME[role as AppRole] ?? "/home";
}

export function pathBelongsToRole(pathname: string, role: string) {
  if (SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return role === "super_admin";
  }
  if (pathname.startsWith("/admin")) return role === "business_admin" || role === "super_admin";
  if (pathname.startsWith("/super")) return role === "super_admin";
  if (pathname.startsWith("/agent")) return role === "delivery_agent";
  return true;
}
