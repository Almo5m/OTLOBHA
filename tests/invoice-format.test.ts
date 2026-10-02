import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, formatQuantity, toInvoiceLines, wrapText } from "@/lib/invoice/format";

test("formatMoney uses latin digits, thousands separator and max 2 decimals", () => {
  assert.equal(formatMoney(1234.5), "1,234.5");
  assert.equal(formatMoney(0), "0");
  assert.equal(formatMoney(10.456), "10.46");
  assert.equal(formatMoney(100), "100");
});

test("formatQuantity trims trailing zeros", () => {
  assert.equal(formatQuantity(2), "2");
  assert.equal(formatQuantity(0.5), "0.5");
  assert.equal(formatQuantity(1.2504), "1.25");
});

test("toInvoiceLines zeroes unavailable items and keeps prices for available ones", () => {
  const lines = toInvoiceLines([
    { product_name: "طماطم", quantity: "2.000", unit_name: "كيلو", actual_price: "12.50", line_total: "25.00", is_available: true },
    { product_name: "خيار", quantity: 1, unit_name: "كيلو", actual_price: null, line_total: 0, is_available: false }
  ]);
  assert.equal(lines[0].lineTotal, 25);
  assert.equal(lines[0].unitPrice, 12.5);
  assert.equal(lines[0].available, true);
  assert.equal(lines[1].lineTotal, 0);
  assert.equal(lines[1].unitPrice, null);
  assert.equal(lines[1].available, false);
});

test("wrapText breaks on word boundaries within the width", () => {
  const measure = (s: string) => s.length * 10;
  const lines = wrapText("شارع الملك فيصل عمارة 12 الدور الثالث", 150, measure);
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(measure(l) <= 150, l);
  assert.equal(lines.join(" "), "شارع الملك فيصل عمارة 12 الدور الثالث");
});

test("wrapText splits a single over-long word by characters", () => {
  const measure = (s: string) => s.length * 10;
  const lines = wrapText("ااااااااااااااااااااا", 50, measure);
  for (const l of lines) assert.ok(measure(l) <= 50);
  assert.equal(lines.join(""), "ااااااااااااااااااااا");
});

test("wrapText handles empty input", () => {
  assert.deepEqual(wrapText("   ", 100, (s) => s.length), [""]);
});
