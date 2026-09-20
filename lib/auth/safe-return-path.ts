const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

export function safeReturnPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f]/.test(value)) return fallback;

  try {
    const resolved = new URL(value, PLACEHOLDER_ORIGIN);
    if (resolved.origin !== PLACEHOLDER_ORIGIN) return fallback;
  } catch {
    return fallback;
  }

  return value;
}
