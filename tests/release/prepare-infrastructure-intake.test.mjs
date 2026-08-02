import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..", "..");
const preparer = path.join(projectRoot, "scripts/release/prepare-infrastructure-intake.mjs");

async function prepare(target) {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-infra-prepare-"));
  const output = path.join(root, "intake.json");
  const result = spawnSync(
    process.execPath,
    [preparer, "--deploy-target", target, "--output", output],
    { cwd: projectRoot, encoding: "utf8" },
  );
  return { root, output, result };
}

test("腾讯云接入清单按私有权限生成且保留托管数据服务", async () => {
  const prepared = await prepare("tencent");
  try {
    assert.equal(prepared.result.status, 0, prepared.result.stderr);
    const intake = JSON.parse(await readFile(prepared.output, "utf8"));
    assert.equal(intake.deployTarget, "tencent");
    assert.equal(intake.database.topology, "managed");
    assert.equal(intake.cache.topology, "managed");
    if (process.platform !== "win32") {
      assert.equal((await stat(prepared.output)).mode & 0o777, 0o600);
    }
  } finally {
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("standard 接入清单切换为自建数据服务且默认拒绝覆盖", async () => {
  const prepared = await prepare("standard");
  try {
    assert.equal(prepared.result.status, 0, prepared.result.stderr);
    const intake = JSON.parse(await readFile(prepared.output, "utf8"));
    assert.equal(intake.deployTarget, "standard");
    assert.equal(intake.database.topology, "self-hosted");
    assert.equal(intake.cache.topology, "self-hosted");
    assert.equal(intake.database.endpointHost, "postgres");
    assert.equal(intake.cache.endpointHost, "redis");

    const repeated = spawnSync(
      process.execPath,
      [preparer, "--deploy-target", "standard", "--output", prepared.output],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(repeated.status, 0);
    assert.match(repeated.stderr, /拒绝覆盖/);
  } finally {
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("缺少明确部署架构时拒绝生成接入清单", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-infra-prepare-invalid-"));
  try {
    const result = spawnSync(
      process.execPath,
      [preparer, "--output", path.join(root, "intake.json")],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /standard 或 tencent/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("升级现有接入清单时只补缺失字段并保留原值与备份", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-infra-upgrade-"));
  const output = path.join(root, "intake.json");
  const existing = {
    schemaVersion: 2,
    kind: "guoxue-new-infrastructure-intake",
    deployTarget: "tencent",
    server: {
      provider: "已登记供应商",
      region: "ap-beijing",
    },
  };
  try {
    await writeFile(output, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
    const result = spawnSync(
      process.execPath,
      [preparer, "--deploy-target", "tencent", "--output", output, "--upgrade-existing"],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);

    const upgraded = JSON.parse(await readFile(output, "utf8"));
    assert.equal(upgraded.server.provider, "已登记供应商");
    assert.equal(upgraded.server.region, "ap-beijing");
    assert.ok(upgraded.appDeepLinks);
    assert.ok(upgraded.migration.publicCompliance);

    const backups = (await readdir(root)).filter((name) => name.startsWith("intake.json.backup-"));
    assert.equal(backups.length, 1);
    assert.deepEqual(JSON.parse(await readFile(path.join(root, backups[0]), "utf8")), existing);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("升级时拒绝改变现有部署架构", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-infra-upgrade-target-"));
  const output = path.join(root, "intake.json");
  try {
    await writeFile(
      output,
      `${JSON.stringify({
        schemaVersion: 2,
        kind: "guoxue-new-infrastructure-intake",
        deployTarget: "tencent",
      })}\n`,
      "utf8",
    );
    const result = spawnSync(
      process.execPath,
      [preparer, "--deploy-target", "standard", "--output", output, "--upgrade-existing"],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /部署架构/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
