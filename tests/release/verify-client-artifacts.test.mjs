import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = path.join(repoRoot, "scripts", "release", "verify-client-artifacts.mjs");
const releaseId = "release-client-verify-test";
const sourceCommit = "b".repeat(40);
const directories = [
  "apps/admin/dist",
  "apps/mobile/dist/build/h5",
  "apps/mobile/dist/build/mp-weixin",
  "apps/mobile/dist/build/app",
  "apps/mobile/dist/build/app-harmony",
];

function digest(relative, content) {
  return createHash("sha256")
    .update(relative, "utf8")
    .update("\0")
    .update(String(Buffer.byteLength(content)), "utf8")
    .update("\0")
    .update(content)
    .update("\0")
    .digest("hex");
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-client-verify-"));
  const auditFile = path.join(root, "release-evidence", "client-artifact-audit.json");
  const outputFile = path.join(root, "release-evidence", "client-artifact-verification.json");
  const targets = [];
  let totalBytes = 0;
  for (const [index, directory] of directories.entries()) {
    const content = `artifact-${index}`;
    await mkdir(path.join(root, directory), { recursive: true });
    await writeFile(path.join(root, directory, "index.js"), content);
    const bytes = Buffer.byteLength(content);
    totalBytes += bytes;
    targets.push({
      name: `target-${index}`,
      directory,
      files: 1,
      bytes,
      contentSha256: digest("index.js", content),
      success: true,
    });
  }
  await mkdir(path.dirname(auditFile), { recursive: true });
  await writeFile(
    auditFile,
    `${JSON.stringify({
      schemaVersion: 2,
      releaseId,
      sourceCommit,
      success: true,
      counts: { targets: 5, files: 5, bytes: totalBytes, errors: 0 },
      targets,
      errors: [],
    })}\n`,
  );
  return { root, auditFile, outputFile };
}

function runVerify(fixture, overrides = {}) {
  return spawnSync(
    process.execPath,
    [
      script,
      fixture.auditFile,
      "--root",
      fixture.root,
      "--expected-release-id",
      overrides.releaseId || releaseId,
      "--expected-commit",
      overrides.sourceCommit || sourceCommit,
      "--output",
      fixture.outputFile,
    ],
    { cwd: fixture.root, encoding: "utf8" },
  );
}

test("五端下载成品与审计指纹完全一致时通过独立验真", async () => {
  const fixture = await createFixture();
  try {
    const result = runVerify(fixture);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(await readFile(fixture.outputFile, "utf8"));
    assert.equal(report.success, true);
    assert.equal(report.releaseId, releaseId);
    assert.equal(report.sourceCommit, sourceCommit);
    assert.equal(report.counts.targets, 5);
    assert.equal(
      report.targets.every((target) => target.matches),
      true,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("任一下载成品被改动时阻断并保留验真报告", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(path.join(fixture.root, directories[1], "index.js"), "tampered");
    const result = runVerify(fixture);
    assert.equal(result.status, 1);
    const report = JSON.parse(await readFile(fixture.outputFile, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /客户端成品与审计指纹不一致/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("发布标识或源码提交与本次交付不一致时阻断", async () => {
  const fixture = await createFixture();
  try {
    const result = runVerify(fixture, {
      releaseId: "release-other-version",
      sourceCommit: "c".repeat(40),
    });
    assert.equal(result.status, 1);
    const report = JSON.parse(await readFile(fixture.outputFile, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /发布标识不一致/);
    assert.match(report.errors.join("\n"), /源码提交不一致/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
