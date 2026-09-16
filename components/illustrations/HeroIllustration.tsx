export default function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 220" className={className} aria-hidden="true">
      {/* الأرضية */}
      <ellipse cx="140" cy="196" rx="100" ry="10" fill="var(--color-border)" opacity="0.5" />

      {/* صندوق التوصيل */}
      <rect x="95" y="110" width="90" height="70" rx="10" fill="var(--color-accent-soft)" />
      <path d="M95 132h90" stroke="var(--color-accent)" strokeWidth="3" />
      <path d="M140 110v70" stroke="var(--color-accent)" strokeWidth="3" opacity="0.5" />

      {/* الدراجة/المندوب المبسّط */}
      <circle cx="70" cy="150" r="14" fill="none" stroke="var(--color-text-primary)" strokeWidth="4" />
      <circle cx="200" cy="150" r="14" fill="none" stroke="var(--color-text-primary)" strokeWidth="4" />
      <path d="M70 150h40l14-32h30M124 150l16-32" stroke="var(--color-text-primary)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="154" cy="118" r="10" fill="var(--color-ink)" />

      {/* لمسات عائمة */}
      <circle cx="235" cy="70" r="6" fill="var(--color-warning)" />
      <circle cx="45" cy="60" r="4" fill="var(--color-accent)" />
      <path d="M215 100l8 8M223 100l-8 8" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
