export default function NoOrdersIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} width="160" height="128" aria-hidden="true">
      <ellipse cx="100" cy="140" rx="60" ry="8" fill="var(--color-border)" opacity="0.5" />
      <rect x="55" y="45" width="90" height="75" rx="14" fill="var(--color-accent-soft)" />
      <rect x="70" y="60" width="60" height="8" rx="4" fill="var(--color-accent)" opacity="0.55" />
      <rect x="70" y="76" width="42" height="8" rx="4" fill="var(--color-border)" />
      <rect x="70" y="92" width="50" height="8" rx="4" fill="var(--color-border)" />
      <circle cx="145" cy="45" r="16" fill="var(--color-accent)" />
      <path d="M145 38v14M138 45h14" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
