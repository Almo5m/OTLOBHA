import ExcelJS from "exceljs";
import { sanitizeCell } from "@/lib/export/sanitize-cell";

export async function buildWorkbookBuffer(rows: Record<string, unknown>[], sheetName: string) {
  const columnKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columnKeys.map((key) => ({ header: key, key }));

  rows.forEach((row) => {
    sheet.addRow(Object.fromEntries(columnKeys.map((key) => [key, sanitizeCell(row[key])])));
  });

  return workbook.xlsx.writeBuffer();
}
