import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const script = "scripts/operations/audit-tencent-cloud-readiness.py";

function pythonCommand() {
  const candidates = process.platform === "win32" ? ["python", "py"] : ["python3", "python"];
  for (const command of candidates) {
    const args = command === "py" ? ["-3", "--version"] : ["--version"];
    const result = spawnSync(command, args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error && result.status === 0) {
      return { command, prefix: command === "py" ? ["-3"] : [] };
    }
  }
  throw new Error("未找到可用的 Python 3 运行时");
}

function runAudit(args) {
  const python = pythonCommand();
  return spawnSync(python.command, [...python.prefix, script, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      TENCENT_REGION: "",
      TENCENT_CLB_ID: "",
      TENCENT_CDN_DOMAIN: "",
      TENCENT_CERTIFICATE_DOMAIN: "",
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    },
  });
}

function evaluateFixture(fixture) {
  const python = pythonCommand();
  const program = [
    "import importlib.util, json, pathlib, sys",
    "path = pathlib.Path(r'scripts/operations/audit-tencent-cloud-readiness.py')",
    "spec = importlib.util.spec_from_file_location('cloud_audit', path)",
    "module = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(module)",
    "print(json.dumps(module.evaluate_readiness(json.loads(sys.stdin.read())), ensure_ascii=False))",
  ].join("; ");
  return spawnSync(python.command, [...python.prefix, "-c", program], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    input: JSON.stringify(fixture),
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
  });
}

test("腾讯云审计显式绑定新环境资源后可在离线模式通过", () => {
  const result = runAudit([
    "--validate-input-only",
    "--region",
    "ap-guangzhou",
    "--clb-id",
    "lb-NewTarget123",
    "--cdn-domain",
    "assets.new-guoxue.test",
    "--certificate-domain",
    "new-guoxue.test",
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "ok");
  assert.deepEqual(report.targetBinding, {
    region: "ap-guangzhou",
    clbId: "lb-NewTarget123",
    cdnDomain: "assets.new-guoxue.test",
    certificateDomain: "new-guoxue.test",
  });
  assert.doesNotMatch(result.stdout, /TmpSecret|SecretKey|Token/u);
});

test("腾讯云审计拒绝缺少目标绑定或继续使用占位域名", () => {
  const missing = runAudit(["--validate-input-only"]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /缺少目标环境资源绑定/u);

  const placeholder = runAudit([
    "--validate-input-only",
    "--region",
    "ap-guangzhou",
    "--clb-id",
    "lb-NewTarget123",
    "--cdn-domain",
    "static.example.com",
    "--certificate-domain",
    "example.com",
  ]);
  assert.notEqual(placeholder.status, 0);
  assert.match(placeholder.stderr, /占位域名/u);
});

test("腾讯云审计可从受控环境文件读取目标资源绑定", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gx-tencent-cloud-audit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const envFile = path.join(directory, ".env.production");
  const reportFile = path.join(directory, "tencent-cloud-readiness.json");
  await writeFile(
    envFile,
    [
      "TENCENT_REGION=ap-guangzhou",
      "TENCENT_CLB_ID=lb-NewTarget123",
      "TENCENT_CDN_DOMAIN=assets.new-guoxue.test",
      "TENCENT_CERTIFICATE_DOMAIN=new-guoxue.test",
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runAudit([
    "--validate-input-only",
    "--env-file",
    envFile,
    "--release-id",
    "release-cloud-test",
    "--report",
    reportFile,
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes("Secret"), false);
  // 离线校验只验证输入绑定，不能伪造云 API 已通过的正式现场证据。
  await assert.rejects(readFile(reportFile, "utf8"), /ENOENT/u);
});

test("腾讯云审计正式证据写盘使用结构化 JSON 和受控权限", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gx-tencent-cloud-report-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const reportFile = path.join(directory, "tencent-cloud-readiness.json");
  const python = pythonCommand();
  const program = [
    "import importlib.util, pathlib",
    "path = pathlib.Path(r'scripts/operations/audit-tencent-cloud-readiness.py')",
    "spec = importlib.util.spec_from_file_location('cloud_audit', path)",
    "module = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(module)",
    `module.write_report(r'${reportFile.replaceAll("\\", "\\\\")}', {'schemaVersion': 1, 'success': True})`,
  ].join("; ");
  const result = spawnSync(python.command, [...python.prefix, "-c", program], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(await readFile(reportFile, "utf8")), {
    schemaVersion: 1,
    success: true,
  });
});

test("腾讯云资源查询被拒绝或目标资源为空时不得假通过", () => {
  const readyCall = (data) => ({ status: "ok", data });
  const ready = evaluateFixture({
    monitor: readyCall({ policies: [{ policyId: "policy-1" }] }),
    clb: readyCall({ listeners: [{ listenerId: "lbl-1" }] }),
    cdn: readyCall({ targetFound: true, domains: [{ domain: "assets.new-guoxue.test" }] }),
    ssl: readyCall({ certificates: [{ certificateId: "cert-1" }] }),
  });
  assert.equal(ready.status, 0, ready.stderr);
  assert.equal(JSON.parse(ready.stdout).success, true);

  const blocked = evaluateFixture({
    monitor: { status: "denied-or-failed", error: "AuthFailure" },
    clb: readyCall({ listeners: [] }),
    cdn: readyCall({ targetFound: false, domains: [] }),
    ssl: readyCall({ certificates: [] }),
  });
  assert.equal(blocked.status, 0, blocked.stderr);
  const report = JSON.parse(blocked.stdout);
  assert.equal(report.success, false);
  assert.match(report.failures.join("\n"), /云监控策略查询失败|CLB 未找到监听器|CDN 域名未找到|未找到证书/u);
});
