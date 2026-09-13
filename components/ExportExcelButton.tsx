"use client";

export default function ExportExcelButton({ data, filename, label }: { data: any[]; filename: string; label: string }) {
  async function handleExport() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "بيانات");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  return <button onClick={handleExport} className="btn-secondary text-sm">{label}</button>;
}
