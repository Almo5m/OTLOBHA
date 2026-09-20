"use client";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function ExportExcelButton({ data, filename, label }: { data: Record<string, unknown>[]; filename: string; label: string }) {
  async function handleExport() {
    const { buildWorkbookBuffer } = await import("@/lib/export/build-workbook");
    const buffer = await buildWorkbookBuffer(data, "بيانات");

    const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <button onClick={handleExport} className="btn-secondary text-sm">{label}</button>;
}
