import { test } from "node:test";
import assert from "node:assert/strict";
import { fillTemplate, toInternationalEgyptPhone, trackingUrl, waLink } from "@/lib/whatsapp";

test("converts local Egyptian numbers to international format", () => {
  assert.equal(toInternationalEgyptPhone("01012345678"), "201012345678");
  assert.equal(toInternationalEgyptPhone("0101 234 5678"), "201012345678");
  assert.equal(toInternationalEgyptPhone("201012345678"), "201012345678");
});

test("wa.me link carries an encoded message", () => {
  const link = waLink("01012345678", "أهلاً\nطلبك جاهز");
  assert.ok(link.startsWith("https://wa.me/201012345678?text="));
  assert.equal(decodeURIComponent(link.split("?text=")[1]), "أهلاً\nطلبك جاهز");
});

test("fillTemplate replaces variables and drops unknown ones", () => {
  const out = fillTemplate("أهلاً {{customer_name}}، طلب {{ order_number }} {{missing}}!", {
    customer_name: "أحمد", order_number: "ORD-1001"
  });
  assert.equal(out, "أهلاً أحمد، طلب ORD-1001 !");
});

test("fillTemplate renders zero and handles null", () => {
  assert.equal(fillTemplate("{{a}}|{{b}}", { a: 0, b: null }), "0|");
});

test("tracking url has no double slash", () => {
  assert.equal(trackingUrl("https://x.com/", "abc"), "https://x.com/order/abc");
  assert.equal(trackingUrl("https://x.com", "abc"), "https://x.com/order/abc");
});
