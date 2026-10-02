import { toWesternDigits } from "@/lib/format/digits";

export const STAFF_ROLES = ["delivery_agent", "business_admin", "super_admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_EMAIL_DOMAIN = "otlobha.local";
export const staffEmail = (phone: string) => `${phone}@${STAFF_EMAIL_DOMAIN}`;

export function normalizePhone(value: unknown) {
  return toWesternDigits(String(value ?? "")).replace(/\s/g, "");
}

export function isValidPhone(phone: string) {
  return /^01[0125][0-9]{8}$/.test(phone);
}

export function isStaffRoleValue(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

/** بيرجّع رسالة خطأ أو null لو البيانات سليمة */
export function validateNewStaff(input: { full_name?: unknown; phone?: unknown; role?: unknown; password?: unknown }): string | null {
  if (String(input.full_name ?? "").trim().length < 2) return "اكتب اسم الموظف";
  if (!isValidPhone(normalizePhone(input.phone))) return "رقم الموبايل لازم يكون رقم مصري من 11 رقم";
  if (!isStaffRoleValue(input.role)) return "الدور غير صحيح";
  if (typeof input.password !== "string" || input.password.length < 8) return "كلمة المرور لازم تكون 8 أحرف على الأقل";
  return null;
}
