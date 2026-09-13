import Icon from "./Icon";

type Tone = "accent" | "brand" | "success" | "warning" | "error" | "info";

const TONE_BG: Record<Tone, string> = {
  accent: "bg-accent",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info"
};

// "brand" الآن لون Ink المحايد (أسود في الفاتح/أبيض في الغامق) فلازم نص الأيقونة
// يتبع inkContrast بدل الأبيض الثابت، وإلا يختفي في الـDark Mode
const TONE_TEXT: Record<Tone, string> = {
  accent: "text-white",
  brand: "text-inkContrast",
  success: "text-white",
  warning: "text-white",
  error: "text-white",
  info: "text-white"
};

/**
 * شارة أيقونة بخلفية لونية أساسية صريحة (Solid) بدل الخلفيات الباهتة —
 * تُستخدم للعناصر البارزة (بطاقات الإحصائيات، التصنيفات، عناصر القوائم)
 * مع الحفاظ على لون واحد مسيطر (Accent) في أغلب الحالات لتجنّب Rainbow UI.
 */
export default function IconBadge({
  name, tone = "accent", size = "md", glow = false
}: {
  name: Parameters<typeof Icon>[0]["name"];
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}) {
  const boxSize = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 26 : 20;

  return (
    <div
      className={`flex ${boxSize} shrink-0 items-center justify-center rounded-lg ${TONE_BG[tone]} ${TONE_TEXT[tone]} shadow-sm ${glow ? "glow-accent is-active" : ""}`}
    >
      <Icon name={name} size={iconSize} />
    </div>
  );
}
