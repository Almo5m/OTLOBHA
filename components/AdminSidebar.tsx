"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

type NavItem = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"] };
type NavGroup = { label: string; items: NavItem[] };

function SidebarLink({ href, label, iconName, onNavigate }: {
  href: string; label: string; iconName: Parameters<typeof Icon>[0]["name"]; onNavigate: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
        active ? "bg-brand text-inkContrast font-medium" : "text-textSecondary hover:bg-surfaceElevated"
      }`}
    >
      <Icon name={iconName} size={18} />
      {label}
    </Link>
  );
}

/**
 * القائمة الجانبية الكاملة للوحة التحكم. بتتعمل عن طريق Portal لـ document.body
 * بدل ما تتحط جوّه الـheader مباشرة — لأن الـheader فيه backdrop-blur، واللي
 * بيعمل "containing block" جديد لأي عنصر fixed جواه (خاصية معروفة في CSS)،
 * فكانت القائمة بتتحبس جوّه صندوق الهيدر الصغير بدل ما تغطي الشاشة كلها.
 * الـPortal بيخرجها بره الشجرة دي تمامًا. وموضعها اتحدد صراحةً right-0 (مش
 * معتمد على ترتيب flex) عشان تفضل تطلع من اليمين مهما كان اتجاه الصفحة.
 */
export default function AdminSidebar({ groups, superLinks, isSuperAdmin }: {
  groups: NavGroup[]; superLinks: NavItem[]; isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-[1px]"
          />
          <aside className="absolute inset-y-0 right-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-l border-borderc bg-bg shadow-xl">
            <div className="flex items-center justify-between bg-brand px-4 py-4 text-inkContrast">
              <span className="text-sm font-bold">القائمة</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/15"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-4 p-3">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-3.5 text-[11px] font-bold uppercase tracking-wide text-textSecondary">{group.label}</p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <SidebarLink key={item.href} href={item.href} label={item.label} iconName={item.icon} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                </div>
              ))}

              {isSuperAdmin && (
                <div>
                  <p className="mb-1 px-3.5 text-[11px] font-bold uppercase tracking-wide text-accent">Super Admin</p>
                  <div className="flex flex-col gap-0.5">
                    {superLinks.map((item) => (
                      <SidebarLink key={item.href} href={item.href} label={item.label} iconName={item.icon} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                </div>
              )}
            </nav>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
