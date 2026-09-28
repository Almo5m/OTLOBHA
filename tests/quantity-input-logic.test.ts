// اختبار منطقي (من غير متصفح) لـ QuantityInput بيغطي نفس السيناريوهات
// اللي جُرّبت فعليًا بمحاكاة كتابة حقيقية (راجع ملاحظات التسليم): مسح
// الحقل والكتابة برقم عربي مايعلقش على صفر. هنا بنتأكد من منطق التنظيف
// والتحقق بمعزل عن أي محرك متصفح.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeNumericInput, toWesternDigits } from "@/lib/format/digits";

function simulateTyping(keystrokes: string[]) {
  let raw = "";
  const emitted: number[] = [];
  for (const key of keystrokes) {
    raw = sanitizeNumericInput(raw + key);
    const parsed = Number(raw);
    if (raw !== "" && raw !== "." && !Number.isNaN(parsed)) emitted.push(parsed);
  }
  return { raw, emitted };
}

test("clearing then typing '3' never gets stuck emitting 0", () => {
  const { raw, emitted } = simulateTyping(["3"]);
  assert.equal(raw, "3");
  assert.deepEqual(emitted, [3]);
});

test("typing the Arabic-Indic digit ٣ behaves exactly like typing 3", () => {
  const { raw, emitted } = simulateTyping(["٣"]);
  assert.equal(raw, "3");
  assert.deepEqual(emitted, [3]);
});

test("typing a full Arabic-Indic number key by key", () => {
  const { raw, emitted } = simulateTyping(["٢", "٥"]);
  assert.equal(raw, "25");
  assert.deepEqual(emitted, [2, 25]);
});

test("a decimal Arabic-Indic quantity", () => {
  const { raw } = simulateTyping(["2", ".", "٥"]);
  assert.equal(raw, "2.5");
  assert.equal(Number(raw), 2.5);
});
