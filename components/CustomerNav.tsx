"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import Wordmark from "./Wordmark";
import ThemeToggle from "./theme/ThemeToggle";
import AnnouncementBar from "./AnnouncementBar";
import { useCartStore } from "@/lib/cart-store";

const links = [
  { href: "/home", label: "الرئيسية", icon: "market" as const },
  { href: "/orders", label: "طلباتي", icon: "orders" as const },
  { href: "/cart", label: "السلة", icon: "cart" as const },
  { href: "/profile", label: "حسابي", icon: "account" as const }
];

export default function CustomerNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.items.length);

  return (
    <>
      {/* Top bar: يظهر دائمًا، ويحمل الشعار وتبديل الثيم */}
      <header className="sticky top-0 z-20 border-b border-borderc bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/home"><Wordmark /></Link>
          <div className="flex items-center gap-1">
            <Link href="/search" className="flex h-9 w-9 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated" aria-label="بحث">
              <Icon name="search" size={19} />
            </Link>
            <ThemeToggle />
            {/* روابط أفقية على الشاشات المتوسطة فأكبر بدل الـBottom Bar */}
            <nav className="hidden items-center gap-1 md:flex">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-all duration-base ${
                      active ? "bg-accent-soft text-accent-strong" : "text-textSecondary hover:bg-surfaceElevated"
                    }`}
                  >
                    <Icon name={l.icon} size={16} />
                    {l.label}
                    {l.href === "/cart" && cartCount > 0 && (
                      <span className="numeric absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <AnnouncementBar />

      {/* Bottom Tab Bar: للموبايل فقط — Touch-first */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borderc bg-surface/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-2 py-1.5">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition-all duration-base"
              >
                <span className="relative">
                  <Icon name={l.icon} size={21} className={`transition-transform duration-base ${active ? "scale-110 text-accent" : "text-textSecondary"}`} />
                  {l.href === "/cart" && cartCount > 0 && (
                    <span className="numeric absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] ${active ? "font-medium text-accent" : "text-textSecondary"}`}>{l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
