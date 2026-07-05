export interface CsvColumn<T = unknown> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export function generateCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const BOM = "﻿";
  const header = columns.map((c) => escapeCsvField(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((col) => escapeCsvField(String(col.accessor(row) ?? ""))).join(","),
  );
  return BOM + [header, ...body].join("\r\n");
}

function escapeCsvField(value: string): string {
  // 防止 CSV 公式注入：以 = + - @ 开头的值加单引号前缀
  if (/^[=+\-@]/.test(value)) {
    value = `'${value}`;
  }
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
