import { createHash } from "node:crypto";
import { createReadStream, lstatSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const valueOf = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};
const rootArg = valueOf("--root");
const reportArg = valueOf("--report");
if (!rootArg || !reportArg) {
  console.error(
    "用法：node scripts/release/build-storage-inventory.mjs --root <桶同步目录> --report <脱敏摘要.json>",
  );
  process.exit(2);
}

const root = path.resolve(rootArg);
const reportPath = path.resolve(reportArg);
const rootStat = lstatSync(root, { throwIfNoEntry: false });
if (!rootStat?.isDirectory()) {
  console.error("错误：--root 必须是已完成同步的普通目录");
  process.exit(2);
}

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("清单目录不得包含符号链接或联接点");
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile()) files.push(absolute);
    else throw new Error("清单目录只能包含普通文件和目录");
  }
};

const hashFile = (file) =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

try {
  walk(root);
  if (files.length === 0) throw new Error("桶同步目录为空，拒绝生成可上线清单");
  const records = [];
  for (const absolute of files) {
    const stat = lstatSync(absolute);
    const key = path.relative(root, absolute).split(path.sep).join("/");
    records.push({ key, size: stat.size, sha256: await hashFile(absolute) });
  }
  records.sort((left, right) => left.key.localeCompare(right.key, "en"));
  const manifest = records.map((item) => `${item.key}\t${item.size}\t${item.sha256}\n`).join("");
  const report = {
    schemaVersion: 1,
    kind: "guoxue-storage-inventory-summary",
    generatedAtUtc: new Date().toISOString(),
    manifestAlgorithm: "sha256-content-v1",
    objectCount: records.length,
    totalBytes: records.reduce((total, item) => total + item.size, 0),
    manifestSha256: createHash("sha256").update(manifest).digest("hex"),
  };
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `对象存储清单摘要已生成：${report.objectCount} 个对象、${report.totalBytes} 字节；报告不包含目录、对象键或文件内容`,
  );
} catch (error) {
  console.error(`错误：${error.message}`);
  process.exit(1);
}
