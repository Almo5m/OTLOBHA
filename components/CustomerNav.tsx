"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import Wordmark from "./Wordmark";
import ThemeToggle from "./theme/ThemeToggle";

const links = [
  { href: "/home", label: "الرئيسية", icon: "market" as const },
  { href: "/orders", label: "طلباتي", icon: "orders" as const },
  { href: "/cart", label: "السلة", icon: "cart" as const },
  { href: "/debts", label: "المديونية", icon: "debt" as const },
  { href: "/profile", label: "حسابي", icon: "account" as const }
];

export default function CustomerNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar: يظهر دائمًا، ويحمل الشعار وتبديل الثيم */}
      <header className="sticky top-0 z-20 border-b border-borderc bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/home"><Wordmark /></Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {/* روابط أفقية على الشاشات المتوسطة فأكبر بدل الـBottom Bar */}
            <nav className="hidden items-center gap-1 md:flex">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-all duration-base ${
                      active ? "glow-accent is-active bg-accent-soft text-accent-strong" : "text-textSecondary hover:bg-surfaceElevated"
                    }`}
                  >
                    <Icon name={l.icon} size={16} />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Bottom Tab Bar: للموبايل فقط — Touch-first */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borderc bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-2 py-1.5">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-all duration-base"
              >
                <Icon name={l.icon} size={21} className={`transition-transform duration-base ${active ? "scale-110 text-accent" : "text-textSecondary"}`} />
                <span className={`text-[11px] ${active ? "font-medium text-accent" : "text-textSecondary"}`}>{l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
