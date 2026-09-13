import Link from "next/link";
import Wordmark from "./Wordmark";
import Icon from "./Icon";
import ThemeToggle from "./theme/ThemeToggle";

export default function AgentNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-borderc bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/agent/dashboard" className="flex items-center gap-2">
          <Wordmark />
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-strong">المندوب</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/agent/profile" className="flex h-9 w-9 items-center justify-center rounded-full text-textSecondary hover:bg-surfaceElevated">
            <Icon name="account" size={19} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
