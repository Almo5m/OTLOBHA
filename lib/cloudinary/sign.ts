import crypto from "crypto";

export const ALLOWED_IMAGE_FORMATS = "jpg,jpeg,png,webp";

// "guest" = أي زائر من غير تسجيل دخول (العميل بيطلب من غير حساب)
export type UploadRole = "guest" | "delivery_agent" | "business_admin" | "super_admin";

const STAFF: UploadRole[] = ["delivery_agent", "business_admin", "super_admin"];
const ADMINS: UploadRole[] = ["business_admin", "super_admin"];

export const UPLOAD_PURPOSES = {
  catalog: { folder: "otlobha/catalog", roles: ADMINS },
  "payment-proof": { folder: "otlobha/payment-proofs", roles: ["guest"] as UploadRole[] },
  "product-request": { folder: "otlobha/product-requests", roles: ["guest"] as UploadRole[] },
  // صورة الفاتورة بتتولّد في متصفح الإداري وتترفع هنا
  invoice: { folder: "otlobha/invoices", roles: STAFF }
} as const;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

export function isUploadPurpose(value: unknown): value is UploadPurpose {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(UPLOAD_PURPOSES, value);
}

export function roleCanUpload(purpose: UploadPurpose, role: UploadRole) {
  return (UPLOAD_PURPOSES[purpose].roles as readonly UploadRole[]).includes(role);
}

export function buildUploadParams(purpose: UploadPurpose, timestamp: number) {
  return {
    allowed_formats: ALLOWED_IMAGE_FORMATS,
    folder: UPLOAD_PURPOSES[purpose].folder,
    timestamp: String(timestamp)
  };
}

export function signUploadParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
}
