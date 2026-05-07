/**
 * 将数据导出为 CSV 文件并触发下载
 */
export function exportCSV(filename: string, columns: { label: string; key: string }[], rows: Record<string, any>[]) {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      return csvEscape(val != null ? String(val) : "");
    }).join(","),
  ).join("\n");

  const BOM = "﻿";
  const blob = new Blob([BOM + header + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
