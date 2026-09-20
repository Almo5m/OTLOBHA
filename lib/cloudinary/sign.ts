import crypto from "crypto";

export const ALLOWED_IMAGE_FORMATS = "jpg,jpeg,png,webp";

export const UPLOAD_PURPOSES = {
  catalog: { folder: "otlobha/catalog", roles: ["business_admin", "super_admin"] },
  "payment-proof": { folder: "otlobha/payment-proofs", roles: ["customer"] }
} as const;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

export function isUploadPurpose(value: unknown): value is UploadPurpose {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(UPLOAD_PURPOSES, value);
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
