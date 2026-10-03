import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeNumericInput } from "@/lib/format/digits";

// NumberField بيعتمد على sanitizeNumericInput — لازم يسمح بالمراحل الوسيطة من الكتابة
test("keeps in-progress decimals so users can type 0.10", () => {
  for (const step of ["0", "0.", "0.1", "0.10"]) assert.equal(sanitizeNumericInput(step), step);
});

test("allows clearing the field and strips junk", () => {
  assert.equal(sanitizeNumericInput(""), "");
  assert.equal(sanitizeNumericInput("1a2b"), "12");
  assert.equal(sanitizeNumericInput("1.2.3"), "1.23");
  assert.equal(sanitizeNumericInput("١٢"), "12");
});
