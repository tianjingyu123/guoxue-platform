import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const validator = path.join(projectRoot, "scripts/release/validate-release-layout.sh");

function toBashPath(value) {
  return value.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

function run(projectDir, platformRoot) {
  return spawnSync(
    "bash",
    [toBashPath(validator), toBashPath(projectDir), toBashPath(platformRoot)],
    { encoding: "utf8" },
  );
}

async function fixture(releaseId = "release-20260731-001") {
  const root = await mkdtemp(path.join(tmpdir(), "guoxue-release-layout-"));
  const platformRoot = path.join(root, "platform");
  const releaseDir = path.join(platformRoot, "releases", releaseId);
  await mkdir(releaseDir, { recursive: true });
  await writeFile(path.join(releaseDir, ".release-id"), `${releaseId}\n`, "utf8");
  return { root, platformRoot, releaseDir, releaseId };
}

test("首次初始化目录与 releases/<release-id> 完全一致时通过", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = run(item.releaseDir, item.platformRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, item.releaseId);
});

test("固定包位于 incoming 或其他目录时阻断首次初始化", async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const incoming = path.join(item.platformRoot, "incoming", item.releaseId);
  await mkdir(incoming, { recursive: true });
  await writeFile(path.join(incoming, ".release-id"), `${item.releaseId}\n`, "utf8");
  const result = run(incoming, item.platformRoot);
  assert.equal(result.status, 64);
  assert.match(result.stderr, /不受版本管理/);
});

test("非法发布标识在任何系统改动前被拒绝", async (t) => {
  const item = await fixture("release-valid-001");
  t.after(() => rm(item.root, { recursive: true, force: true }));
  await writeFile(path.join(item.releaseDir, ".release-id"), "../escape\n", "utf8");
  const result = run(item.releaseDir, item.platformRoot);
  assert.equal(result.status, 64);
  assert.match(result.stderr, /格式无效/);
});
