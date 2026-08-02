import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const builder = path.join(projectRoot, "scripts/release/build-storage-inventory.mjs");
const comparer = path.join(projectRoot, "scripts/release/compare-storage-inventories.mjs");
const run = (script, args) =>
  spawnSync(process.execPath, [script, ...args], { cwd: projectRoot, encoding: "utf8" });

test("相同目录生成的脱敏对象清单可形成 GO 证据", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-storage-inventory-"));
  const sourceDir = path.join(root, "source");
  const targetDir = path.join(root, "target");
  const sourceReport = path.join(root, "source.json");
  const targetReport = path.join(root, "target.json");
  const comparisonReport = path.join(root, "comparison.json");
  try {
    await mkdir(path.join(sourceDir, "private"), { recursive: true });
    await mkdir(path.join(targetDir, "private"), { recursive: true });
    await writeFile(path.join(sourceDir, "private", "avatar.png"), "same-content", "utf8");
    await writeFile(path.join(targetDir, "private", "avatar.png"), "same-content", "utf8");
    assert.equal(run(builder, ["--root", sourceDir, "--report", sourceReport]).status, 0);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(run(builder, ["--root", targetDir, "--report", targetReport]).status, 0);
    const result = run(comparer, [
      "--source",
      sourceReport,
      "--target",
      targetReport,
      "--report",
      comparisonReport,
    ]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(await readFile(comparisonReport, "utf8"));
    assert.equal(report.success, true);
    assert.equal(JSON.stringify(report).includes("avatar.png"), false);
    assert.equal(JSON.stringify(await readFile(sourceReport, "utf8")).includes("private"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("对象内容不同即使文件大小相同也会 BLOCK", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-storage-inventory-"));
  const sourceDir = path.join(root, "source");
  const targetDir = path.join(root, "target");
  const sourceReport = path.join(root, "source.json");
  const targetReport = path.join(root, "target.json");
  const comparisonReport = path.join(root, "comparison.json");
  try {
    await mkdir(sourceDir);
    await mkdir(targetDir);
    await writeFile(path.join(sourceDir, "asset.bin"), "AAAA", "utf8");
    await writeFile(path.join(targetDir, "asset.bin"), "BBBB", "utf8");
    assert.equal(run(builder, ["--root", sourceDir, "--report", sourceReport]).status, 0);
    assert.equal(run(builder, ["--root", targetDir, "--report", targetReport]).status, 0);
    const result = run(comparer, [
      "--source",
      sourceReport,
      "--target",
      targetReport,
      "--report",
      comparisonReport,
    ]);
    assert.equal(result.status, 1);
    const report = JSON.parse(await readFile(comparisonReport, "utf8"));
    assert.equal(report.success, false);
    assert.equal(
      report.checks.find((item) => item.name === "逐对象内容清单摘要一致").pass,
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
