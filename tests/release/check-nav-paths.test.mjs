import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = resolve("scripts/check-nav-paths.js");
const pagesFile = resolve("apps/mobile/src/pages.json");

test("导航审计可解析互斥的 uni-app 条件编译路由", async () => {
  const pagesSource = await readFile(pagesFile, "utf8");
  assert.match(pagesSource, /^\s*\/\/\s*#ifdef\b/mu);
  assert.match(pagesSource, /^\s*\/\/\s*#ifndef\b/mu);

  const result = spawnSync(process.execPath, [script, "--json"], {
    cwd: resolve("."),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.broken.length, 0);
  assert.equal(report.missingPageFiles.length, 0);
  assert.equal(report.duplicateRoutes.length, 0);
});
