import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = path.join(root, "scripts", "migration", "check-client-artifacts.mjs");

async function fixture(content) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "gx-client-origin-"));
  const dist = path.join(dir, "dist");
  await mkdir(dist);
  await writeFile(path.join(dist, "index.js"), content);
  return { dir, dist };
}

function run(dist, forbidden, expected) {
  return spawnSync(
    process.execPath,
    [script, dist, "--forbid-origin", forbidden, "--expect-origin", expected],
    { cwd: root, encoding: "utf8" },
  );
}

test("继续使用现有正式域名时，同一地址作为预期值不会被误判为旧地址", async () => {
  const item = await fixture("https://api.rebugx.cn/api/v1/health");
  try {
    const result = run(item.dist, "https://api.rebugx.cn", "https://api.rebugx.cn");
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /客户端产物地址已确认/);
  } finally {
    await rm(item.dir, { recursive: true, force: true });
  }
});

test("H5 挂载在现有 API 域名子路径时不会被父域名禁用规则误伤", async () => {
  const item = await fixture("https://api.rebugx.cn/h5/");
  try {
    const result = run(item.dist, "https://api.rebugx.cn", "https://api.rebugx.cn/h5/");
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await rm(item.dir, { recursive: true, force: true });
  }
});

test("切换到新域名时，产物残留旧正式域名仍被阻断", async () => {
  const item = await fixture("https://api.rebugx.cn\nhttps://gx.yrydai.com");
  try {
    const result = run(item.dist, "https://api.rebugx.cn", "https://gx.yrydai.com");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /发现旧地址 https:\/\/api\.rebugx\.cn/);
  } finally {
    await rm(item.dir, { recursive: true, force: true });
  }
});
