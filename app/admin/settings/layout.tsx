import { requireRole } from "@/lib/auth/require-role";

export default async function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["super_admin"]);
  return <>{children}</>;
}
