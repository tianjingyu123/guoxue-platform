#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { StringDecoder } from "node:string_decoder";

const args = process.argv.slice(2);
const bundleArg = args.find((arg) => !arg.startsWith("--"));
const valueOf = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const strict = args.includes("--strict");
const repoRoot = process.cwd();
const bundleDir = bundleArg ? path.resolve(repoRoot, bundleArg) : "";
const contractPath = path.resolve(
  repoRoot,
  valueOf("--contract", "config/migration/legacy-export-contract.json"),
);
const reportArg = valueOf("--report");
const maxExamples = 30;
const maxRecordedIssues = 1000;

if (!bundleDir) {
  console.error(
    "用法：node scripts/migration/audit-legacy-export.mjs <规范化CSV目录> " +
      "[--contract <契约文件>] [--report <报告JSON>] [--strict]",
  );
  process.exit(1);
}

if (!existsSync(bundleDir) || !existsSync(contractPath)) {
  console.error(
    `迁移导出审计失败：目录或契约不存在（目录=${bundleDir}，契约=${contractPath}）`,
  );
  process.exit(1);
}

const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const issues = [];
const issueCounts = { error: 0, warning: 0 };
const fileReports = [];
const retainedValues = new Map();

function addIssue(level, file, row, message) {
  issueCounts[level] += 1;
  if (issues.length < maxRecordedIssues) {
    issues.push({ level, file, row, message });
  }
  if (issueCounts.error + issueCounts.warning <= maxExamples) {
    console[level === "error" ? "error" : "warn"](
      `${level === "error" ? "错误" : "警告"}：${file}${row ? ` 第 ${row} 行` : ""} ${message}`,
    );
  }
}

function isTimestamp(value) {
  if (!value) return true;
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isDecimal(value, nonNegative) {
  if (value === "") return true;
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return false;
  return !nonNegative || Number(value) >= 0;
}

async function parseCsv(filePath, onHeader, onRow) {
  const input = createReadStream(filePath);
  const decoder = new StringDecoder("utf8");
  const hash = createHash("sha256");
  let field = "";
  let row = [];
  let inQuotes = false;
  let quotePending = false;
  let rowNumber = 0;
  let headerSeen = false;

  const emitRow = () => {
    const values = [...row, field];
    row = [];
    field = "";
    if (values.length === 1 && values[0] === "" && headerSeen) return;
    rowNumber += 1;
    if (!headerSeen) {
      values[0] = values[0].replace(/^\uFEFF/, "");
      onHeader(values.map((value) => value.trim()), rowNumber);
      headerSeen = true;
    } else {
      onRow(values, rowNumber);
    }
  };

  const outside = (char) => {
    if (char === "," ) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      emitRow();
    } else if (char !== "\r") {
      if (char === '"' && field === "") inQuotes = true;
      else field += char;
    }
  };

  const feed = (text) => {
    for (const char of text) {
      if (!inQuotes) {
        outside(char);
        continue;
      }
      if (quotePending) {
        if (char === '"') {
          field += '"';
          quotePending = false;
        } else {
          inQuotes = false;
          quotePending = false;
          outside(char);
        }
      } else if (char === '"') {
        quotePending = true;
      } else {
        field += char;
      }
    }
  };

  for await (const chunk of input) {
    hash.update(chunk);
    feed(decoder.write(chunk));
  }
  feed(decoder.end());
  if (quotePending) {
    inQuotes = false;
    quotePending = false;
  }
  if (inQuotes) throw new Error("CSV 存在未闭合的引号字段");
  if (field !== "" || row.length > 0) emitRow();
  if (!headerSeen) throw new Error("CSV 为空或缺少表头");

  return { sha256: hash.digest("hex"), physicalRows: rowNumber };
}

async function auditFile(definition) {
  const filePath = path.join(bundleDir, definition.name);
  if (!existsSync(filePath)) {
    if (definition.required) addIssue("error", definition.name, 0, "必需文件缺失");
    return;
  }

  let headers = [];
  let headerIndex = new Map();
  let dataRows = 0;
  let duplicateRows = 0;
  let invalidRows = 0;
  const keyValues = new Set();
  const retained = new Map();
  for (const column of definition.retainColumns || []) {
    const canReuseKeySet =
      definition.keyColumns?.length === 1 && definition.keyColumns[0] === column;
    retained.set(column, canReuseKeySet ? keyValues : new Set());
  }

  try {
    const parsed = await parseCsv(
      filePath,
      (values) => {
        headers = values;
        headerIndex = new Map(values.map((value, index) => [value, index]));
        if (new Set(values).size !== values.length) {
          addIssue("error", definition.name, 1, "表头存在重复列名");
        }
        for (const column of definition.requiredColumns || []) {
          if (!headerIndex.has(column)) {
            addIssue("error", definition.name, 1, `缺少必需列 ${column}`);
          }
        }
        const extras = values.filter(
          (column) => !(definition.requiredColumns || []).includes(column),
        );
        if (extras.length > 0) {
          addIssue("error", definition.name, 1, `存在契约外列：${extras.join(", ")}`);
        }
      },
      (values, rowNumber) => {
        dataRows += 1;
        let rowInvalid = false;
        if (values.length !== headers.length) {
          addIssue(
            "error",
            definition.name,
            rowNumber,
            `列数为 ${values.length}，应为 ${headers.length}`,
          );
          invalidRows += 1;
          return;
        }
        const get = (column) => String(values[headerIndex.get(column)] ?? "").trim();

        for (const column of definition.keyColumns || []) {
          if (!get(column)) {
            addIssue("error", definition.name, rowNumber, `主键列 ${column} 为空`);
            rowInvalid = true;
          }
        }
        const key = (definition.keyColumns || []).map(get).join("\u001f");
        if (key && keyValues.has(key)) {
          duplicateRows += 1;
          addIssue("error", definition.name, rowNumber, "业务主键重复");
          rowInvalid = true;
        } else if (key) {
          keyValues.add(key);
        }

        for (const group of definition.oneOfColumns || []) {
          if (!group.some((column) => get(column))) {
            addIssue(
              "error",
              definition.name,
              rowNumber,
              `至少一个字段必须有值：${group.join(" / ")}`,
            );
            rowInvalid = true;
          }
        }
        for (const column of definition.timestampColumns || []) {
          if (!isTimestamp(get(column))) {
            addIssue(
              "error",
              definition.name,
              rowNumber,
              `${column} 必须是含时区的 ISO-8601 时间`,
            );
            rowInvalid = true;
          }
        }
        for (const column of definition.decimalColumns || []) {
          if (!isDecimal(get(column), false)) {
            addIssue("error", definition.name, rowNumber, `${column} 不是两位以内小数`);
            rowInvalid = true;
          }
        }
        for (const column of definition.nonNegativeDecimalColumns || []) {
          if (!isDecimal(get(column), true)) {
            addIssue("error", definition.name, rowNumber, `${column} 不是非负两位小数`);
            rowInvalid = true;
          }
        }
        for (const [column, pattern] of Object.entries(
          definition.optionalPatternColumns || {},
        )) {
          const value = get(column);
          if (value && !new RegExp(pattern).test(value)) {
            addIssue("error", definition.name, rowNumber, `${column} 格式不合法`);
            rowInvalid = true;
          }
        }
        for (const [column, allowed] of Object.entries(definition.allowedValues || {})) {
          const value = get(column);
          if (value && !allowed.includes(value)) {
            addIssue(
              "error",
              definition.name,
              rowNumber,
              `${column} 值 ${value} 不在允许枚举中`,
            );
            rowInvalid = true;
          }
        }
        for (const foreignKey of definition.foreignKeys || []) {
          const value = get(foreignKey.column);
          if (!value && foreignKey.allowEmpty) continue;
          const target = retainedValues.get(
            `${foreignKey.targetFile}:${foreignKey.targetColumn}`,
          );
          if (!target || !target.has(value)) {
            addIssue(
              "error",
              definition.name,
              rowNumber,
              `${foreignKey.column} 无法关联 ${foreignKey.targetFile}.${foreignKey.targetColumn}`,
            );
            rowInvalid = true;
          }
        }
        for (const [column, valuesSet] of retained) {
          const value = get(column);
          if (value) valuesSet.add(value);
        }
        if (rowInvalid) invalidRows += 1;
      },
    );

    if (dataRows < (definition.minRows || 0)) {
      addIssue(
        "error",
        definition.name,
        0,
        `数据行数 ${dataRows} 少于最低要求 ${definition.minRows}`,
      );
    }
    for (const [column, valuesSet] of retained) {
      retainedValues.set(`${definition.name}:${column}`, valuesSet);
    }
    fileReports.push({
      file: definition.name,
      rows: dataRows,
      invalidRows,
      duplicateRows,
      sha256: parsed.sha256,
    });
    console.log(
      `已扫描 ${definition.name}：${dataRows} 行，SHA-256 ${parsed.sha256.slice(0, 16)}…`,
    );
  } catch (error) {
    addIssue("error", definition.name, 0, error instanceof Error ? error.message : String(error));
  }
}

for (const file of contract.files || []) {
  await auditFile(file);
}

const errors = issueCounts.error;
const warnings = issueCounts.warning;
const report = {
  auditedAt: new Date().toISOString(),
  sourceSystem: contract.sourceSystem,
  contractVersion: contract.contractVersion,
  bundleDir,
  files: fileReports,
  summary: {
    filesExpected: (contract.files || []).length,
    filesScanned: fileReports.length,
    rowsScanned: fileReports.reduce((sum, file) => sum + file.rows, 0),
    errors,
    warnings,
    issuesRecorded: issues.length,
    issuesTruncated: errors + warnings > issues.length,
  },
  issues,
};

if (reportArg) {
  const reportPath = path.resolve(repoRoot, reportArg);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`审计报告已写入：${reportPath}`);
}

console.log(
  `迁移导出审计汇总：${report.summary.filesScanned}/${report.summary.filesExpected} 个文件，` +
    `${report.summary.rowsScanned} 行，${errors} 个错误，${warnings} 个警告`,
);

if (errors > 0 || (strict && warnings > 0)) {
  console.error(
    errors + warnings > maxExamples
      ? `控制台仅展示前 ${maxExamples} 个问题；JSON 报告最多记录前 ${maxRecordedIssues} 个。`
      : "迁移导出未达到可导入标准。",
  );
  process.exit(1);
}

console.log("迁移导出契约校验通过，可进入离线干跑；本脚本不会写入数据库。");
