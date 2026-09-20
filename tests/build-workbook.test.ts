import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildWorkbookBuffer } from "@/lib/export/build-workbook";

async function readSheet(rows: Record<string, unknown>[]) {
  const buffer = await buildWorkbookBuffer(rows, "بيانات");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as ArrayBuffer);
  return workbook.getWorksheet("بيانات")!;
}

test("writes headers and rows", async () => {
  const sheet = await readSheet([
    { الاسم: "أحمد", الطلبات: 3 },
    { الاسم: "منى", الطلبات: 5 }
  ]);
  assert.equal(sheet.getRow(1).getCell(1).value, "الاسم");
  assert.equal(sheet.getRow(2).getCell(1).value, "أحمد");
  assert.equal(sheet.getRow(3).getCell(2).value, 5);
});

test("formula-looking text is stored as plain text, never as a formula", async () => {
  const sheet = await readSheet([{ name: "=1+1", note: "+cmd", ok: "fine" }]);
  const cells = [sheet.getRow(2).getCell(1), sheet.getRow(2).getCell(2)];
  for (const cell of cells) {
    assert.equal(cell.type, ExcelJS.ValueType.String);
    assert.equal(typeof cell.value, "string");
    assert.ok((cell.value as string).startsWith("'"));
  }
  assert.equal(sheet.getRow(2).getCell(3).value, "fine");
});

test("uses the union of keys across rows", async () => {
  const sheet = await readSheet([{ a: 1 }, { b: 2 }]);
  assert.equal(sheet.getRow(1).getCell(1).value, "a");
  assert.equal(sheet.getRow(1).getCell(2).value, "b");
  assert.equal(sheet.getRow(3).getCell(2).value, 2);
});

test("handles an empty data set", async () => {
  const sheet = await readSheet([]);
  assert.equal(sheet.rowCount, 0);
});
