/**
 * 将数据导出为 CSV 文件并触发下载
 */
export function exportCSV(filename: string, columns: { label: string; prop?: string; key?: string }[], rows: Record<string, unknown>[]) {
  downloadCsvRows(filename, [
    columns.map((column) => column.label),
    ...rows.map((row) =>
      columns.map((c) => {
        const field = c.prop || c.key || "";
        const val = row[field];
        return val ?? "";
      }),
    ),
  ]);
}

/** 生成可安全交给 Excel / WPS 打开的 CSV 文本。 */
export function buildCsv(rows: unknown[][]): string {
  const BOM = "﻿";
  return BOM + rows
    .map((row) => row.map((value) => csvEscape(value == null ? "" : String(value))).join(","))
    .join("\r\n");
}

/** 统一 CSV 下载，处理公式注入、字段转义、文件名和 Safari 点击兼容。 */
export function downloadCsvRows(filename: string, rows: unknown[][]): void {
  const safeName = filename.replace(/[\\/:*?"<>|]/g, "-").replace(/\.csv$/i, "");
  const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvEscape(v: string): string {
  // Excel / WPS 会把以 =、+、-、@ 开头的单元格当公式执行；前导空白同样需要拦截。
  // 保留可见原值，只添加文本前缀，避免昵称、标题等不可信数据触发表格公式注入。
  if (/^[\t\r\n ]*[=+\-@]/.test(v)) v = `'${v}`;
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
