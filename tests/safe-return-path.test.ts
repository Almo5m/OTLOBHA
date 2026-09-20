import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath } from "@/lib/auth/safe-return-path";

const FALLBACK = "/home";

test("keeps ordinary internal paths", () => {
  assert.equal(safeReturnPath("/checkout", FALLBACK), "/checkout");
  assert.equal(safeReturnPath("/orders/123?tab=items", FALLBACK), "/orders/123?tab=items");
  assert.equal(safeReturnPath("/", FALLBACK), "/");
});

test("falls back for empty values", () => {
  assert.equal(safeReturnPath(null, FALLBACK), FALLBACK);
  assert.equal(safeReturnPath(undefined, FALLBACK), FALLBACK);
  assert.equal(safeReturnPath("", FALLBACK), FALLBACK);
});

test("rejects absolute and protocol-relative URLs", () => {
  for (const value of [
    "https://evil.example",
    "http://evil.example/path",
    "//evil.example",
    "///evil.example",
    "evil.example",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>"
  ]) {
    assert.equal(safeReturnPath(value, FALLBACK), FALLBACK, value);
  }
});

test("rejects backslash and control-character tricks", () => {
  for (const value of ["/\\evil.example", "/\\/evil.example", "/\tevil", "/\nhttps://evil.example", "/\u0000x"]) {
    assert.equal(safeReturnPath(value, FALLBACK), FALLBACK, JSON.stringify(value));
  }
});
