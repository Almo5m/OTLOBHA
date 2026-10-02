import { test } from "node:test";
import assert from "node:assert/strict";
import { isStaffRoleValue, normalizePhone, staffEmail, validateNewStaff } from "@/lib/auth/staff-validation";

const valid = { full_name: "أحمد علي", phone: "01012345678", role: "delivery_agent", password: "12345678" };

test("accepts a valid staff payload", () => assert.equal(validateNewStaff(valid), null));

test("rejects customer role (no customer accounts anymore)", () => {
  assert.ok(validateNewStaff({ ...valid, role: "customer" }));
  assert.equal(isStaffRoleValue("customer"), false);
});

test("rejects bad phone, short name and short password", () => {
  assert.ok(validateNewStaff({ ...valid, phone: "0101234" }));
  assert.ok(validateNewStaff({ ...valid, full_name: "ا" }));
  assert.ok(validateNewStaff({ ...valid, password: "1234567" }));
});

test("normalizes Arabic-Indic digits and builds the login email", () => {
  assert.equal(normalizePhone("٠١٠١٢٣٤٥٦٧٨"), "01012345678");
  assert.equal(staffEmail("01012345678"), "01012345678@otlobha.local");
});
