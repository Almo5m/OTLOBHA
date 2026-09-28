import { test } from "node:test";
import assert from "node:assert/strict";
import { toWesternDigits, sanitizeNumericInput } from "@/lib/format/digits";

test("converts Arabic-Indic digits to Western digits", () => {
  assert.equal(toWesternDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
  assert.equal(toWesternDigits("٢.٥"), "2.5");
  assert.equal(toWesternDigits("١٥٠"), "150");
});

test("converts Extended Arabic-Indic (Persian/Urdu) digits to Western digits", () => {
  assert.equal(toWesternDigits("۰۱۲۳۴۵۶۷۸۹"), "0123456789");
});

test("leaves already-Western digits and mixed text untouched", () => {
  assert.equal(toWesternDigits("123"), "123");
  assert.equal(toWesternDigits("قطعة 12"), "قطعة 12");
});

test("sanitizeNumericInput strips anything that is not a digit or a dot", () => {
  assert.equal(sanitizeNumericInput("١٢٣"), "123");
  assert.equal(sanitizeNumericInput("12ك"), "12");
  assert.equal(sanitizeNumericInput("abc"), "");
  assert.equal(sanitizeNumericInput(""), "");
});

test("sanitizeNumericInput keeps only the first decimal point", () => {
  assert.equal(sanitizeNumericInput("2.5.3"), "2.53");
  assert.equal(sanitizeNumericInput("١.٥"), "1.5");
  assert.equal(sanitizeNumericInput("."), ".");
  assert.equal(sanitizeNumericInput("1.."), "1.");
});
