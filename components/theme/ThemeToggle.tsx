"use client";

import { useTheme } from "./ThemeProvider";
import Icon from "@/components/Icon";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="تبديل الوضع الليلي"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-textSecondary transition-all duration-base hover:bg-accent-soft hover:text-accent-strong active:scale-90 ${className}`}
    >
      <span className="animate-scaleIn" key={theme}>
        <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
      </span>
    </button>
  );
}
