"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

type NavItem = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] };

function SidebarLink({ href, label, iconName, onNavigate }: {
  href: string; label: string; iconName: Parameters<typeof Icon>[0]["name"]; onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors ${
        active ? "bg-accent-soft font-medium text-accent-strong" : "text-textSecondary hover:bg-surfaceElevated"
      }`}
    >
      <Icon name={iconName} size={18} />
      {label}
    </Link>
  );
}

// القائمة الجانبية الكاملة للوحة التحكم — بديل عن شريط الأيقونات الطويل في
// الأعلى. الـnavbar بيفضل فيه بس أهم رابطين (الرئيسية + الطلبات)، وكل حاجة
// تانية (بما فيها روابط Super Admin) موجودة هنا.
export default function AdminSidebar({ groups, superLinks, isSuperAdmin }: {
  groups: NavItem[][]; superLinks: NavItem[]; isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح القائمة"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated"
      >
        <Icon name="menu" size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
            className="flex-1 bg-ink/40 backdrop-blur-[1px]"
          />
          <aside className="flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-l border-borderc bg-bg p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between px-1 py-1">
              <span className="text-sm font-bold text-textSecondary">القائمة</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="flex h-8 w-8 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {groups.map((group, gi) => (
                <div key={gi} className={gi > 0 ? "mt-2 border-t border-borderc pt-2" : undefined}>
                  {group.map((item) => (
                    <SidebarLink key={item.href} href={item.href} label={item.label} iconName={item.icon} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              ))}

              {isSuperAdmin && (
                <div className="mt-2 border-t border-borderc pt-2">
                  <p className="mb-1 px-3.5 text-xs font-medium text-textSecondary">Super Admin</p>
                  {superLinks.map((item) => (
                    <SidebarLink key={item.href} href={item.href} label={item.label} iconName={item.icon} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
