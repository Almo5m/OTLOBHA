import { requireRole } from "@/lib/auth/require-role";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["delivery_agent"]);
  return <>{children}</>;
}
