import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const creator = path.join(projectRoot, "scripts/release/create-client-config-binding.mjs");
const verifier = path.join(projectRoot, "scripts/release/verify-client-config-binding.mjs");
const releaseId = "release-binding-0001";
const commit = "a".repeat(40);
const publicValues = {
  VITE_API_URL: "https://api.new-platform.test",
  VITE_PUBLIC_H5_URL: "https://app.new-platform.test/h5",
  VITE_PUBLIC_ASSET_ORIGIN: "https://assets.new-platform.test",
};

function envText(values = publicValues) {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-client-config-binding-"));
  const envFile = path.join(root, "client.env");
  const bindingFile = path.join(root, "client-config-binding.json");
  await writeFile(envFile, envText(), "utf8");
  const result = spawnSync(
    process.execPath,
    [
      creator,
      envFile,
      "--release-id",
      releaseId,
      "--source-commit",
      commit,
      "--output",
      bindingFile,
    ],
    { cwd: projectRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return { root, envFile, bindingFile };
}

test("CI 客户端公开配置与服务器生产配置一致时通过且绑定文件不落原始 URL", async () => {
  const fixture = await createFixture();
  try {
    const reportFile = path.join(fixture.root, "verification.json");
    const result = spawnSync(
      process.execPath,
      [
        verifier,
        fixture.bindingFile,
        fixture.envFile,
        "--expected-release-id",
        releaseId,
        "--expected-commit",
        commit,
        "--report",
        reportFile,
      ],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const bindingText = await readFile(fixture.bindingFile, "utf8");
    assert.equal(
      Object.values(publicValues).some((value) => bindingText.includes(value)),
      false,
    );
    const report = JSON.parse(await readFile(reportFile, "utf8"));
    assert.equal(report.success, true);
    assert.equal(report.releaseId, releaseId);
    assert.equal(report.expectedFingerprint, report.actualFingerprint);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("服务器任一客户端公开配置与 CI 审计配置不一致时阻断", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      fixture.envFile,
      envText({ ...publicValues, VITE_API_URL: "https://api.mismatch.test" }),
      "utf8",
    );
    const reportFile = path.join(fixture.root, "mismatch.json");
    const result = spawnSync(
      process.execPath,
      [verifier, fixture.bindingFile, fixture.envFile, "--report", reportFile],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    const report = JSON.parse(await readFile(reportFile, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /与 CI 审计配置不一致/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("绑定文件发布标识或源提交与本次发布不一致时阻断", async () => {
  const fixture = await createFixture();
  try {
    const reportFile = path.join(fixture.root, "identity-mismatch.json");
    const result = spawnSync(
      process.execPath,
      [
        verifier,
        fixture.bindingFile,
        fixture.envFile,
        "--expected-release-id",
        "release-binding-9999",
        "--expected-commit",
        "b".repeat(40),
        "--report",
        reportFile,
      ],
      { cwd: projectRoot, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    const report = JSON.parse(await readFile(reportFile, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /发布标识不匹配/);
    assert.match(report.errors.join("\n"), /提交不匹配/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
