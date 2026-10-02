// الأدوار الإدارية فقط — العملاء مفيش لهم حسابات (بيطلبوا كزوّار).
export type AppRole = "delivery_agent" | "business_admin" | "super_admin";

export const ROLE_HOME: Record<AppRole, string> = {
  delivery_agent: "/agent/dashboard",
  business_admin: "/admin/dashboard",
  super_admin: "/admin/dashboard"
};

const SUPER_ADMIN_ONLY_PREFIXES = ["/admin/settings", "/admin/categories", "/admin/reports"];

// أي مسار تحت البادئات دي مخصص للإداريين ومحتاج تسجيل دخول
export const STAFF_PREFIXES = ["/admin", "/agent", "/super"];

export function isStaffPath(pathname: string) {
  return STAFF_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isStaffRole(role: string | null | undefined): role is AppRole {
  return role === "delivery_agent" || role === "business_admin" || role === "super_admin";
}

export function homeFor(role: string | null | undefined) {
  return ROLE_HOME[role as AppRole] ?? "/home";
}

export function pathBelongsToRole(pathname: string, role: string) {
  if (!isStaffRole(role)) return !isStaffPath(pathname);
  if (SUPER_ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return role === "super_admin";
  }
  if (pathname.startsWith("/admin")) return role === "business_admin" || role === "super_admin";
  if (pathname.startsWith("/super")) return role === "super_admin";
  if (pathname.startsWith("/agent")) return role === "delivery_agent";
  return true;
}
