import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const valueOf = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};
const sourceArg = valueOf("--source");
const targetArg = valueOf("--target");
const reportArg = valueOf("--report");
if (!sourceArg || !targetArg || !reportArg) {
  console.error(
    "用法：node scripts/release/compare-storage-inventories.mjs --source <旧桶摘要.json> --target <新桶摘要.json> --report <比对证据.json>",
  );
  process.exit(2);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const load = (file) => JSON.parse(readFileSync(path.resolve(file), "utf8"));
const valid = (value) =>
  value?.schemaVersion === 1 &&
  value?.kind === "guoxue-storage-inventory-summary" &&
  value?.manifestAlgorithm === "sha256-content-v1" &&
  Number.isSafeInteger(value?.objectCount) &&
  value.objectCount > 0 &&
  Number.isSafeInteger(value?.totalBytes) &&
  value.totalBytes > 0 &&
  /^[a-f0-9]{64}$/u.test(value?.manifestSha256 || "") &&
  Number.isFinite(Date.parse(value?.generatedAtUtc));

try {
  const source = load(sourceArg);
  const target = load(targetArg);
  const checks = [
    { name: "源桶清单摘要有效", pass: valid(source) },
    { name: "目标桶清单摘要有效", pass: valid(target) },
    { name: "对象数量一致", pass: source.objectCount === target.objectCount },
    { name: "对象总字节数一致", pass: source.totalBytes === target.totalBytes },
    { name: "逐对象内容清单摘要一致", pass: source.manifestSha256 === target.manifestSha256 },
    {
      name: "目标桶清单生成时间不早于源桶",
      pass: Date.parse(target.generatedAtUtc) >= Date.parse(source.generatedAtUtc),
    },
  ];
  const success = checks.every((item) => item.pass);
  const report = {
    schemaVersion: 1,
    kind: "guoxue-storage-inventory-comparison",
    generatedAtUtc: new Date().toISOString(),
    success,
    sourceSummaryFingerprint: sha256(JSON.stringify(source)),
    targetSummaryFingerprint: sha256(JSON.stringify(target)),
    summary: {
      passed: checks.filter((item) => item.pass).length,
      failed: checks.filter((item) => !item.pass).length,
      total: checks.length,
    },
    checks,
  };
  const reportPath = path.resolve(reportArg);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `对象存储清单比对：${success ? "GO" : "BLOCK"}（${report.summary.passed}/${checks.length}）`,
  );
  if (!success) process.exit(1);
} catch (error) {
  console.error(`错误：${error.message}`);
  process.exit(2);
}
