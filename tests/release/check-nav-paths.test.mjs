import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";

const script = resolve("scripts/check-nav-paths.js");
const pagesFile = resolve("apps/mobile/src/pages.json");

test('导航条件编译分别保留 App/微信/H5，未知标识仍拒绝', async () => {
  const source = await readFile(script, 'utf8'); const start = source.indexOf('function compilePagesSource(')
  const end = source.indexOf('const pagesConfigs =', start)
  const compile = vm.runInNewContext(source.slice(start, end) + '\ncompilePagesSource')
  const fixture = '// #ifdef APP-PLUS\napp\n// #endif\n// #ifndef MP-WEIXIN\nnot-mini\n// #endif\n// #ifdef MP-WEIXIN\nmini\n// #endif'
  assert.equal(compile(fixture, 'APP-PLUS'), 'app\nnot-mini')
  assert.equal(compile(fixture, 'MP-WEIXIN'), 'mini')
  assert.equal(compile(fixture, 'H5'), 'not-mini')
  assert.throws(() => compile('// #ifdef UNKNOWN\nbad\n// #endif', 'H5'), /尚未支持/)
  assert.throws(() => compile('// #ifdef H5\nbad', 'H5'), /缺少 #endif/)
});

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
