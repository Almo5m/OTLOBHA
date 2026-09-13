"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

export default function AdminNavLink({ href, label, iconName }: { href: string; label: string; iconName: Parameters<typeof Icon>[0]["name"] }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-all duration-base ${
        active ? "glow-accent is-active bg-accent-soft text-accent-strong font-medium" : "text-textSecondary hover:bg-surfaceElevated"
      }`}
    >
      <Icon name={iconName} size={16} />
      {label}
    </Link>
  );
}
