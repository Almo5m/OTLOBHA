import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeCell } from "@/lib/export/sanitize-cell";

test("neutralizes strings that spreadsheets would treat as formulas", () => {
  for (const value of ["=SUM(A1)", "+1+1", "-2+3", "@cmd", "\t=1", "\r=1", "=HYPERLINK(\"http://evil\")"]) {
    assert.equal(sanitizeCell(value), `'${value}`, JSON.stringify(value));
  }
});

test("leaves ordinary values untouched", () => {
  assert.equal(sanitizeCell("عميل عادي"), "عميل عادي");
  assert.equal(sanitizeCell("a=b"), "a=b");
  assert.equal(sanitizeCell(""), "");
  assert.equal(sanitizeCell(42), 42);
  assert.equal(sanitizeCell(-5), -5);
  assert.equal(sanitizeCell(null), null);
  assert.equal(sanitizeCell(true), true);
  const date = new Date();
  assert.equal(sanitizeCell(date), date);
});
