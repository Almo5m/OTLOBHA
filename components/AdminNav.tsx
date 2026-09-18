import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import Wordmark from "./Wordmark";
import AdminNavLink from "./AdminNavLink";
import AdminSidebar from "./AdminSidebar";
import ThemeToggle from "./theme/ThemeToggle";
import Icon from "./Icon";

type NavItem = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; superOnly?: boolean };

// مجموعات منطقية بعنوان واضح لكل مجموعة — بتظهر كعناوين فرعية في القائمة
// الجانبية عشان التنقل يبقى منظم بدل قايمة طويلة مسطّحة.
// superOnly: الرابط ده ميظهرش لـBusiness Admin، Super Admin بس.
const navGroups: { label: string; items: NavItem[] }[] = [
  { label: "الرئيسية", items: [{ href: "/admin/dashboard", label: "الرئيسية", icon: "dashboard" }] },
  {
    label: "العمليات",
    items: [
      { href: "/admin/orders", label: "الطلبات", icon: "orders" },
      { href: "/admin/customers", label: "العملاء", icon: "customer" },
      { href: "/admin/agents", label: "المندوبين", icon: "agent" },
      { href: "/admin/complaints", label: "الشكاوى", icon: "complaints" }
    ]
  },
  {
    label: "المنتجات",
    items: [
      { href: "/admin/products", label: "المنتجات", icon: "products" },
      { href: "/admin/categories", label: "التصنيفات", icon: "market", superOnly: true }
    ]
  },
  {
    label: "المالية والتسويق",
    items: [
      { href: "/admin/invoices", label: "الفواتير", icon: "invoice" },
      { href: "/admin/debts", label: "الديون", icon: "debt" },
      { href: "/admin/discounts", label: "الخصومات", icon: "wallet" },
      { href: "/admin/promotions", label: "العروض", icon: "rating" },
      { href: "/admin/reports", label: "التقارير", icon: "reports", superOnly: true }
    ]
  },
  { label: "الإعدادات", items: [{ href: "/admin/settings", label: "الإعدادات", icon: "settings", superOnly: true }] }
];

// أكتر 5 أقسام استخدامًا يوميًا — ثابتين في الـnavbar عشان يوصلهم بضغطة واحدة
// من غير ما يفتح القائمة الجانبية
const pinnedLinks: NavItem[] = [
  { href: "/admin/dashboard", label: "الرئيسية", icon: "dashboard" },
  { href: "/admin/orders", label: "الطلبات", icon: "orders" },
  { href: "/admin/products", label: "المنتجات", icon: "products" },
  { href: "/admin/customers", label: "العملاء", icon: "customer" },
  { href: "/admin/agents", label: "المندوبين", icon: "agent" }
];

const superLinks: NavItem[] = [
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

  // Business Admin ميشوفش روابط superOnly (التصنيفات والإعدادات والتقارير)
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => isSuperAdmin || !item.superOnly) }))
    .filter((group) => group.items.length > 0);

  return (
    <header className="sticky top-0 z-20 border-b border-borderc bg-bg/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AdminSidebar groups={visibleGroups} superLinks={superLinks} isSuperAdmin={isSuperAdmin} />
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Wordmark />
              <span className="hidden rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-inkContrast sm:inline">لوحة التحكم</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <a
                href="/home"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-borderc px-3 py-1 text-xs font-medium text-textSecondary transition hover:border-brand hover:text-brand"
              >
                <Icon name="externalLink" size={14} />
                <span className="hidden sm:inline">زيارة الموقع</span>
              </a>
            )}
            <span className="hidden text-sm text-textSecondary sm:inline">{profile?.full_name}</span>
            <ThemeToggle />
          </div>
        </div>

        {/* أكتر 5 أقسام استخدامًا ثابتين هنا — الباقي كله في القائمة الجانبية */}
        <nav className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto px-1">
          {pinnedLinks.map((l) => <AdminNavLink key={l.href} href={l.href} label={l.label} iconName={l.icon} />)}
        </nav>
      </div>
    </header>
  );
}
