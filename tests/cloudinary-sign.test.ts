import { test } from "node:test";
import assert from "node:assert/strict";
import { buildUploadParams, isUploadPurpose, signUploadParams, UPLOAD_PURPOSES } from "@/lib/cloudinary/sign";

test("matches the signature example from the Cloudinary documentation", () => {
  const signature = signUploadParams(
    { timestamp: "1315060510", public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" },
    "abcd"
  );
  assert.equal(signature, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("signature depends on every signed parameter", () => {
  const base = buildUploadParams("payment-proof", 1700000000);
  const original = signUploadParams(base, "secret");
  assert.notEqual(signUploadParams({ ...base, folder: "other" }, "secret"), original);
  assert.notEqual(signUploadParams({ ...base, allowed_formats: "jpg,exe" }, "secret"), original);
  assert.notEqual(signUploadParams({ ...base, timestamp: "1700000001" }, "secret"), original);
  assert.notEqual(signUploadParams(base, "another-secret"), original);
});

test("parameter order does not change the signature", () => {
  assert.equal(
    signUploadParams({ b: "2", a: "1", c: "3" }, "s"),
    signUploadParams({ c: "3", a: "1", b: "2" }, "s")
  );
});

test("upload params restrict formats and pin the folder per purpose", () => {
  const catalog = buildUploadParams("catalog", 1);
  const proof = buildUploadParams("payment-proof", 1);
  assert.equal(catalog.allowed_formats, "jpg,jpeg,png,webp");
  assert.equal(catalog.folder, "otlobha/catalog");
  assert.equal(proof.folder, "otlobha/payment-proofs");
  assert.equal(proof.timestamp, "1");
});

test("only known purposes are accepted", () => {
  assert.equal(isUploadPurpose("catalog"), true);
  assert.equal(isUploadPurpose("payment-proof"), true);
  for (const value of ["__proto__", "constructor", "toString", "", "CATALOG", null, undefined, 1, {}]) {
    assert.equal(isUploadPurpose(value), false, String(value));
  }
});

test("customers can only upload payment proofs, admins only catalog images", () => {
  assert.deepEqual([...UPLOAD_PURPOSES["payment-proof"].roles], ["customer"]);
  assert.ok(UPLOAD_PURPOSES.catalog.roles.every((role) => role.includes("admin")));
});
