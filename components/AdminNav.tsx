import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import Wordmark from "./Wordmark";
import AdminNavLink from "./AdminNavLink";
import ThemeToggle from "./theme/ThemeToggle";
import Icon from "./Icon";

const baseLinks: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { href: "/admin/dashboard", label: "الرئيسية", icon: "dashboard" },
  { href: "/admin/orders", label: "الطلبات", icon: "orders" },
  { href: "/admin/customers", label: "العملاء", icon: "customer" },
  { href: "/admin/products", label: "المنتجات", icon: "products" },
  { href: "/admin/categories", label: "التصنيفات", icon: "market" },
  { href: "/admin/invoices", label: "الفواتير", icon: "invoice" },
  { href: "/admin/debts", label: "الديون", icon: "debt" },
  { href: "/admin/complaints", label: "الشكاوى", icon: "complaints" },
  { href: "/admin/agents", label: "المندوبين", icon: "agent" },
  { href: "/admin/reports", label: "التقارير", icon: "reports" },
  { href: "/admin/settings", label: "الإعدادات", icon: "settings" }
];

const superLinks: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { href: "/super/users", label: "المستخدمين", icon: "account" },
  { href: "/super/policies", label: "السياسات", icon: "invoice" },
  { href: "/super/commission", label: "العمولة", icon: "wallet" },
  { href: "/super/audit-log", label: "Audit Log", icon: "reports" },
  { href: "/super/sessions", label: "الجلسات", icon: "settings" }
];

export default async function AdminNav() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("users").select("role,full_name").eq("id", user?.id).single();
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <header className="sticky top-0 z-20 border-b border-borderc bg-bg/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Wordmark />
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-inkContrast">لوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-textSecondary sm:inline">{profile?.full_name}</span>
            <ThemeToggle />
          </div>
        </div>

        <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {baseLinks.map((l) => <AdminNavLink key={l.href} href={l.href} label={l.label} iconName={l.icon} />)}
        </nav>

        {isSuperAdmin && (
          <nav className="scrollbar-none -mx-1 mt-1 flex gap-1 overflow-x-auto border-t border-borderc px-1 pt-2">
            {superLinks.map((l) => <AdminNavLink key={l.href} href={l.href} label={l.label} iconName={l.icon} />)}
          </nav>
        )}
      </div>
    </header>
  );
}
