export default function SuccessIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} width="160" height="128" aria-hidden="true">
      <circle cx="100" cy="85" r="55" fill="var(--color-accent-soft)" />
      <circle cx="100" cy="85" r="34" fill="var(--color-accent)" />
      <path d="M86 85l10 10 20-22" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="150" cy="45" r="4" fill="var(--color-warning)" />
      <circle cx="45" cy="55" r="3" fill="var(--color-accent)" />
      <circle cx="160" cy="105" r="3" fill="var(--color-accent)" />
    </svg>
  );
}
