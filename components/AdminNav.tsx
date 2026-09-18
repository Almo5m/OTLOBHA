import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import Wordmark from "./Wordmark";
import AdminNavLink from "./AdminNavLink";
import AdminSidebar from "./AdminSidebar";
import ThemeToggle from "./theme/ThemeToggle";
import Icon from "./Icon";

// مجموعات منطقية بدل صف واحد مسطّح فيه كل الصفحات بنفس الأهمية —
// كل مجموعة مفصولة بخط رفيع بدل ما تبقى كل الروابط متساوية بصريًا.
// superOnly: الرابط ده ميظهرش لـBusiness Admin، Super Admin بس.
const navGroups: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; superOnly?: boolean }[][] = [
  [{ href: "/admin/dashboard", label: "الرئيسية", icon: "dashboard" }],
  [
    { href: "/admin/orders", label: "الطلبات", icon: "orders" },
    { href: "/admin/customers", label: "العملاء", icon: "customer" },
    { href: "/admin/agents", label: "المندوبين", icon: "agent" }
  ],
  [
    { href: "/admin/products", label: "المنتجات", icon: "products" },
    { href: "/admin/categories", label: "التصنيفات", icon: "market", superOnly: true }
  ],
  [
    { href: "/admin/invoices", label: "الفواتير", icon: "invoice" },
    { href: "/admin/debts", label: "الديون", icon: "debt" },
    { href: "/admin/discounts", label: "الخصومات", icon: "wallet" },
    { href: "/admin/promotions", label: "العروض", icon: "rating" },
    { href: "/admin/reports", label: "التقارير", icon: "reports", superOnly: true }
  ],
  [
    { href: "/admin/complaints", label: "الشكاوى", icon: "complaints" },
    { href: "/admin/settings", label: "الإعدادات", icon: "settings", superOnly: true }
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

  // Business Admin ميشوفش روابط superOnly (التصنيفات والإعدادات) خالص —
  // المجموعة اللي تفضى منها بتتشال عشان مايفضلش خط فاصل من غير حاجة تحته
  const visibleGroups = navGroups
    .map((group) => group.filter((item) => isSuperAdmin || !item.superOnly))
    .filter((group) => group.length > 0);

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

        {/* أهم رابطين بس ثابتين في الـnavbar — الباقي كله في القائمة الجانبية */}
        <nav className="flex items-center gap-1">
          <AdminNavLink href="/admin/dashboard" label="الرئيسية" iconName="dashboard" />
          <AdminNavLink href="/admin/orders" label="الطلبات" iconName="orders" />
        </nav>
      </div>
    </header>
  );
}
