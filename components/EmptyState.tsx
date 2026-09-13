export default function EmptyState({
  illustration, title, description, action
}: {
  illustration: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
      {illustration}
      <p className="mt-4 font-medium text-textPrimary">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-textSecondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
