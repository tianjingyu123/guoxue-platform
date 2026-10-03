import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const renderer = path.join(repoRoot, "scripts", "release", "render-monitoring-config.mjs");

function createEnv(directory, overrides = {}) {
  const values = {
    WEWORK_CORP_ID: "ww-test",
    WEWORK_AGENT_ID: "1000001",
    WEWORK_AGENT_SECRET: "secret-test",
    DBA_WEWORK_USER_IDS: "dba-user",
    PUBLIC_API_URL: "https://api.new-guoxue.test",
    PUBLIC_ASSET_ORIGIN: "https://static.new-guoxue.test",
    ...overrides,
  };
  const envFile = path.join(directory, ".env.production");
  writeFileSync(
    envFile,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
    "utf8",
  );
  return envFile;
}

test("渲染监控配置时注入本次生产 API 与静态资源域名", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "guoxue-monitoring-render-"));
  try {
    const envFile = createEnv(directory);
    const outputDir = path.join(directory, "generated");
    execFileSync(process.execPath, [renderer, envFile, outputDir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    const prometheus = readFileSync(path.join(outputDir, "prometheus.yml"), "utf8");
    assert.match(prometheus, /https:\/\/api\.new-guoxue\.test\/api\/v1\/health\/live/);
    assert.match(prometheus, /https:\/\/static\.new-guoxue\.test\//);
    assert.doesNotMatch(prometheus, /pre-api\.rebugx\.cn|\$\{PUBLIC_/);

    const alertmanager = readFileSync(path.join(outputDir, "alertmanager.yml"), "utf8");
    assert.doesNotMatch(alertmanager, /\$\{WEWORK_/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("拒绝把示例域名渲染为生产证书探测目标", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "guoxue-monitoring-render-"));
  try {
    const envFile = createEnv(directory, { PUBLIC_API_URL: "https://api.example.com" });
    const result = spawnSync(process.execPath, [renderer, envFile, path.join(directory, "generated")], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /PUBLIC_API_URL.*非占位符/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
