import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import Wordmark from "./Wordmark";
import AdminNavLink from "./AdminNavLink";
import ThemeToggle from "./theme/ThemeToggle";
import Icon from "./Icon";

// مجموعات منطقية بدل صف واحد مسطّح فيه كل الصفحات بنفس الأهمية —
// كل مجموعة مفصولة بخط رفيع بدل ما تبقى كل الروابط متساوية بصريًا
const navGroups: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] }[][] = [
  [{ href: "/admin/dashboard", label: "الرئيسية", icon: "dashboard" }],
  [
    { href: "/admin/orders", label: "الطلبات", icon: "orders" },
    { href: "/admin/customers", label: "العملاء", icon: "customer" },
    { href: "/admin/agents", label: "المندوبين", icon: "agent" }
  ],
  [
    { href: "/admin/products", label: "المنتجات", icon: "products" },
    { href: "/admin/categories", label: "التصنيفات", icon: "market" }
  ],
  [
    { href: "/admin/invoices", label: "الفواتير", icon: "invoice" },
    { href: "/admin/debts", label: "الديون", icon: "debt" },
    { href: "/admin/reports", label: "التقارير", icon: "reports" }
  ],
  [
    { href: "/admin/complaints", label: "الشكاوى", icon: "complaints" },
    { href: "/admin/settings", label: "الإعدادات", icon: "settings" }
  ]
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

        <nav className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1">
          {navGroups.map((group, gi) => (
            <div key={gi} className="flex shrink-0 items-center gap-1">
              {gi > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-borderc" aria-hidden="true" />}
              {group.map((l) => <AdminNavLink key={l.href} href={l.href} label={l.label} iconName={l.icon} />)}
            </div>
          ))}
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
