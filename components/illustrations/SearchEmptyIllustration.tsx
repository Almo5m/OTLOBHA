export default function SearchEmptyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} width="160" height="128" aria-hidden="true">
      <circle cx="90" cy="75" r="42" fill="none" stroke="var(--color-border)" strokeWidth="10" />
      <path d="M120 105l30 30" stroke="var(--color-border)" strokeWidth="10" strokeLinecap="round" />
      <path d="M75 75h30" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
