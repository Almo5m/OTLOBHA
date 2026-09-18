import Icon from "./Icon";

type Tone = "neutral" | "accent" | "brand" | "success" | "warning" | "error" | "info";

const TONE_BG: Record<Tone, string> = {
  neutral: "bg-surfaceElevated",
  accent: "bg-accent",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info"
};

// "brand" بقى بلون هوية "المنيب جو" البرتقالي (مش لون Ink محايد زي الأول)،
// فنص الأيقونة بيتبع inkContrast عشان يفضل مقروء في الوضعين الفاتح والغامق
const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-textPrimary",
  accent: "text-white",
  brand: "text-inkContrast",
  success: "text-white",
  warning: "text-white",
  error: "text-white",
  info: "text-white"
};

/**
 * شارة أيقونة — الافتراضي "neutral" (خلفية محايدة، أيقونة بلون النص) عشان
 * الألوان القوية متتكررش في كل مكان. استخدم tone="accent" أو غيره بس في
 * الحالات اللي فعلاً محتاجة تمييز (زي التصنيفات أو حالة نشطة مهمة).
 */
export default function IconBadge({
  name, tone = "neutral", size = "md"
}: {
  name: Parameters<typeof Icon>[0]["name"];
  tone?: Tone;
  size?: "sm" | "md" | "lg";
}) {
  const boxSize = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 26 : 20;
  const border = tone === "neutral" ? "border border-borderc" : "";

  return (
    <div className={`flex ${boxSize} shrink-0 items-center justify-center rounded-lg ${TONE_BG[tone]} ${TONE_TEXT[tone]} ${border}`}>
      <Icon name={name} size={iconSize} />
    </div>
  );
}
