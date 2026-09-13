type WordmarkVariant = "default" | "onDark" | "onLight" | "mono" | "compact";

/**
 * الشعار الأساسي لـ«اطلبها»: Wordmark بنص HTML حقيقي (وليس SVG <text>) لضمان
 * ثبات العرض عبر كل المتصفحات وأحجام الشاشات، مع لمسة بصرية بسيطة (نقطة
 * بلون الـAccent) ترمز للحركة/التوصيل.
 */
export default function Wordmark({
  variant = "default",
  className = ""
}: {
  variant?: WordmarkVariant;
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-base font-extrabold text-inkContrast ${className}`}
        aria-label="اطلبها"
      >
        ا
      </span>
    );
  }

  const textColorClass =
    variant === "onDark" ? "text-white" : variant === "onLight" ? "text-[#131315]" : variant === "mono" ? "text-current" : "text-textPrimary";

  const dotColorClass = variant === "mono" ? "bg-current" : "bg-accent";

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`} aria-label="اطلبها">
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotColorClass}`} />
      <span className={`text-xl font-extrabold leading-none ${textColorClass}`}>اطلبها</span>
    </span>
  );
}
