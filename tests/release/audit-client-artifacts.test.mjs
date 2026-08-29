import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const script = path.join(repoRoot, "scripts", "release", "audit-client-artifacts.mjs");
const releaseId = "release-client-test";
const sourceCommit = "a".repeat(40);
const apiUrl = "https://api.new-platform.test";
const h5Url = "https://app.new-platform.test/h5";
const assetUrl = "https://assets.new-platform.test";
const targets = [
  ["apps/admin/dist", `${apiUrl}\n${h5Url}`],
  ["apps/mobile/dist/build/h5", `${apiUrl}\n${assetUrl}`],
  ["apps/mobile/dist/build/mp-weixin", `${apiUrl}\n${assetUrl}`],
  ["apps/mobile/dist/build/app", `${apiUrl}\n${assetUrl}`],
  ["apps/mobile/dist/build/app-harmony", `${apiUrl}\n${assetUrl}`],
];

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "gx-client-artifacts-"));
  const envFile = path.join(root, "production-client.env");
  const reportFile = path.join(root, "evidence", "client-artifact-audit.json");
  await writeFile(
    envFile,
    [
      `VITE_API_URL=${apiUrl}`,
      `VITE_PUBLIC_H5_URL=${h5Url}`,
      `VITE_PUBLIC_ASSET_ORIGIN=${assetUrl}`,
      "",
    ].join("\n"),
  );
  for (const [directory, content] of targets) {
    const target = path.join(root, directory);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "index.js"), content);
  }
  return { root, envFile, reportFile };
}

function runAudit({ root, envFile, reportFile }, options = {}) {
  const sourceArgs = options.omitSourceCommit ? [] : ["--source-commit", sourceCommit];
  return spawnSync(
    process.execPath,
    [script, envFile, "--release-id", releaseId, ...sourceArgs, "--report", reportFile],
    { cwd: root, encoding: "utf8" },
  );
}

test("五类客户端成品均包含正式公开配置时生成成功报告", async () => {
  const fixture = await createFixture();
  try {
    const result = runAudit(fixture);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(await readFile(fixture.reportFile, "utf8"));
    assert.equal(report.schemaVersion, 2);
    assert.equal(report.releaseId, releaseId);
    assert.equal(report.sourceCommit, sourceCommit);
    assert.equal(report.success, true);
    assert.equal(report.counts.targets, 5);
    assert.equal(report.counts.files, 5);
    assert.equal(report.counts.textFiles, 5);
    assert.equal(report.counts.errors, 0);
    assert.equal(report.counts.bytes > 0, true);
    assert.equal(
      report.targets.every((target) => target.success),
      true,
    );
    assert.equal(
      report.targets.every(
        (target) => target.bytes > 0 && /^[a-f0-9]{64}$/u.test(target.contentSha256),
      ),
      true,
    );
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("正式发布标识缺少源码提交时阻断审计", async () => {
  const fixture = await createFixture();
  try {
    const result = runAudit(fixture, { omitSourceCommit: true });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /指定 --release-id 时必须同时提供 --source-commit/);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("客户端成品内容变化后确定性指纹同步变化", async () => {
  const fixture = await createFixture();
  try {
    const firstResult = runAudit(fixture);
    assert.equal(firstResult.status, 0, firstResult.stderr);
    const firstReport = JSON.parse(await readFile(fixture.reportFile, "utf8"));
    const firstDigest = firstReport.targets.find((target) => target.name === "H5")?.contentSha256;

    await writeFile(
      path.join(fixture.root, "apps/mobile/dist/build/h5/index.js"),
      `${apiUrl}\n${assetUrl}\nwindow.__artifactRevision = 2;`,
    );
    const secondResult = runAudit(fixture);
    assert.equal(secondResult.status, 0, secondResult.stderr);
    const secondReport = JSON.parse(await readFile(fixture.reportFile, "utf8"));
    const secondDigest = secondReport.targets.find((target) => target.name === "H5")?.contentSha256;

    assert.match(firstDigest, /^[a-f0-9]{64}$/u);
    assert.match(secondDigest, /^[a-f0-9]{64}$/u);
    assert.notEqual(secondDigest, firstDigest);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("任一客户端成品包含源码映射时失败但仍落盘审计报告", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(path.join(fixture.root, "apps/mobile/dist/build/h5/index.js.map"), "{}");
    const result = runAudit(fixture);
    assert.equal(result.status, 1);
    const report = JSON.parse(await readFile(fixture.reportFile, "utf8"));
    assert.equal(report.success, false);
    assert.equal(report.counts.errors, 1);
    assert.match(report.errors[0], /H5 含 1 个源码映射文件/);
    assert.equal(report.targets.find((target) => target.name === "H5")?.success, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("正式客户端成品残留 pre-* 预发布地址时阻断审计", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      path.join(fixture.root, "apps/mobile/dist/build/h5/index.js"),
      `${apiUrl}\n${assetUrl}\nhttps://pre-api.rebugx.cn/api/v1/health`,
    );
    const result = runAudit(fixture);
    assert.equal(result.status, 1);
    const report = JSON.parse(await readFile(fixture.reportFile, "utf8"));
    assert.equal(report.success, false);
    assert.match(report.errors.join("\n"), /H5 正式成品仍包含 pre-\* 预发布地址/);
    assert.equal(report.targets.find((target) => target.name === "H5")?.success, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("预发布原生包仅允许引用正式用户协议和隐私政策页面", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      fixture.envFile,
      [
        "VITE_API_URL=https://pre-api.rebugx.cn",
        "VITE_PUBLIC_H5_URL=https://pre-api.rebugx.cn/h5",
        "VITE_PUBLIC_ASSET_ORIGIN=https://pre-static.rebugx.cn",
        "",
      ].join("\n"),
    );
    for (const [directory] of targets) {
      const expected = directory === "apps/admin/dist"
        ? "https://pre-api.rebugx.cn\nhttps://pre-api.rebugx.cn/h5"
        : "https://pre-api.rebugx.cn\nhttps://pre-static.rebugx.cn";
      await writeFile(
        path.join(fixture.root, directory, "index.js"),
        `${expected}\nhttps://api.rebugx.cn/h5/pkg-settings/user-agreement/index\nhttps://api.rebugx.cn/h5/pkg-settings/privacy-policy/index`,
      );
    }

    const result = runAudit(fixture);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("预发布原生 manifest 允许正式微信 Universal Link，其他产物仍不得引用", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      fixture.envFile,
      [
        "VITE_API_URL=https://pre-api.rebugx.cn",
        "VITE_PUBLIC_H5_URL=https://pre-api.rebugx.cn/h5",
        "VITE_PUBLIC_ASSET_ORIGIN=https://pre-static.rebugx.cn",
        "",
      ].join("\n"),
    );
    for (const [directory] of targets) {
      const expected = directory === "apps/admin/dist"
        ? "https://pre-api.rebugx.cn\nhttps://pre-api.rebugx.cn/h5"
        : "https://pre-api.rebugx.cn\nhttps://pre-static.rebugx.cn";
      await writeFile(path.join(fixture.root, directory, "index.js"), expected);
    }
    await writeFile(
      path.join(fixture.root, "apps/mobile/dist/build/app/manifest.json"),
      "https://pre-api.rebugx.cn\nhttps://pre-static.rebugx.cn\nhttps://api.rebugx.cn/h5/",
    );
    let result = runAudit(fixture);
    assert.equal(result.status, 0, result.stderr);

    await writeFile(
      path.join(fixture.root, "apps/mobile/dist/build/app/index.js"),
      "https://pre-api.rebugx.cn\nhttps://pre-static.rebugx.cn\nhttps://api.rebugx.cn/h5/",
    );
    result = runAudit(fixture);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /App 仍包含旧域名/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("预发布原生包中的其他正式业务地址及法律链接扩展路径仍被阻断", async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      fixture.envFile,
      [
        "VITE_API_URL=https://pre-api.rebugx.cn",
        "VITE_PUBLIC_H5_URL=https://pre-api.rebugx.cn/h5",
        "VITE_PUBLIC_ASSET_ORIGIN=https://pre-static.rebugx.cn",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(fixture.root, "apps/mobile/dist/build/app/index.js"),
      "https://pre-api.rebugx.cn\nhttps://pre-static.rebugx.cn\nhttps://api.rebugx.cn/api/v1/health\nhttps://api.rebugx.cn/h5/pkg-settings/privacy-policy/index/extra",
    );

    const result = runAudit(fixture);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /App 仍包含旧域名/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
