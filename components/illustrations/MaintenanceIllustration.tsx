export default function MaintenanceIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} width="160" height="128" aria-hidden="true">
      <rect x="50" y="40" width="100" height="80" rx="16" fill="var(--color-accent-soft)" />
      <circle cx="100" cy="80" r="22" fill="none" stroke="var(--color-accent)" strokeWidth="6" />
      <path d="M100 68v12l8 8" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="140" cy="50" r="5" fill="var(--color-warning)" />
    </svg>
  );
}
