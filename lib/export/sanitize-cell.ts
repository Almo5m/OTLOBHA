const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export function sanitizeCell(value: unknown) {
  if (typeof value !== "string") return value;
  return FORMULA_TRIGGERS.some((trigger) => value.startsWith(trigger)) ? `'${value}` : value;
}
