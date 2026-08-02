import assert from "node:assert/strict";
import test from "node:test";

import { verifyPredeployDecision } from "../../scripts/release/verify-predeploy-decision.mjs";

const branch = "main";
const commit = "0123456789abcdef0123456789abcdef01234567";
const generatedAt = new Date().toISOString();

function validReport(overrides = {}) {
  const checks = [
    {
      name: "源码冻结身份一致",
      pass: true,
      detail: "分支与提交身份完全匹配",
      source: "source-freeze-readiness.json",
    },
    {
      name: "基础设施预接入通过",
      pass: true,
      detail: "资源清单、正式环境和部署架构绑定一致",
      source: "infrastructure-intake-predeploy.json",
    },
    {
      name: "正式环境完整检查通过",
      pass: true,
      detail: "正式环境与部署架构检查通过",
      source: "environment-readiness.json",
    },
  ];
  return {
    schemaVersion: 1,
    kind: "guoxue-predeploy-decision",
    generatedAt,
    decision: "GO",
    expectedBranch: branch,
    expectedCommit: commit,
    deployTarget: "tencent",
    maxAgeHours: 24,
    summary: { total: checks.length, passed: checks.length, failed: 0 },
    checks,
    blockers: [],
    sources: {
      sourceFreeze: { file: "source-freeze-readiness.json", sha256: "a".repeat(64), generatedAt },
      infrastructure: {
        file: "infrastructure-intake-predeploy.json",
        sha256: "b".repeat(64),
        generatedAt,
      },
      environment: { file: "environment-readiness.json", sha256: "c".repeat(64), generatedAt },
    },
    ...overrides,
  };
}

function verify(report, overrides = {}) {
  const raw = JSON.stringify(report);
  return verifyPredeployDecision(report, {
    expectedBranch: branch,
    expectedCommit: commit,
    deployTarget: "tencent",
    maxAgeHours: 24,
    raw,
    ...overrides,
  });
}

test("当前默认分支、提交和部署架构的完整 GO 报告通过验真", () => {
  assert.equal(verify(validReport()).success, true);
});

test("BLOCK 或仍含阻断项的报告不能进入下一阶段", () => {
  const report = validReport({
    decision: "BLOCK",
    blockers: [{ source: "environment-readiness.json", check: "正式环境不完整" }],
  });
  const result = verify(report);
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /不是 GO|仍包含阻断项/u);
});

test("提交、分支、部署架构或证据时效不一致时拒绝", () => {
  const result = verify(validReport(), { expectedCommit: "f".repeat(40), maxAgeHours: 12 });
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /提交与预期不一致|时效参数与预期不一致/u);
});

test("GO 报告缺少源证据或检查汇总不一致时拒绝", () => {
  const report = validReport({
    summary: { total: 9, passed: 9, failed: 0 },
    sources: {
      sourceFreeze: { file: "source-freeze-readiness.json", sha256: "a".repeat(64), generatedAt },
    },
  });
  const result = verify(report);
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /汇总与检查项不一致|完整绑定三份源证据/u);
});

test("统一报告意外包含连接串、网址、私钥或本机路径时拒绝上传", () => {
  const report = validReport();
  const result = verifyPredeployDecision(report, {
    expectedBranch: branch,
    expectedCommit: commit,
    deployTarget: "tencent",
    maxAgeHours: 24,
    raw: `${JSON.stringify(report)} https://secret.example.test/path`,
  });
  assert.equal(result.success, false);
  assert.match(result.errors.join("\n"), /包含连接串、网址、私钥或本机路径/u);
});

test("安全归档模式允许结构完整的 BLOCK，但仍拒绝额外详情字段", () => {
  const report = validReport({
    decision: "BLOCK",
    summary: { total: 3, passed: 2, failed: 1 },
    checks: validReport().checks.map((check, index) =>
      index === 2 ? { ...check, pass: false, detail: "正式环境不完整" } : check,
    ),
    blockers: [{ source: "environment-readiness.json", check: "正式环境完整检查通过" }],
  });
  const safe = verifyPredeployDecision(report, {
    expectedBranch: branch,
    expectedCommit: commit,
    deployTarget: "tencent",
    maxAgeHours: 24,
    raw: JSON.stringify(report),
    requireGo: false,
  });
  assert.equal(safe.success, true, safe.errors.join("\n"));

  report.blockers[0].detail = "secret-value";
  const unsafe = verifyPredeployDecision(report, {
    expectedBranch: branch,
    expectedCommit: commit,
    deployTarget: "tencent",
    maxAgeHours: 24,
    raw: JSON.stringify(report),
    requireGo: false,
  });
  assert.equal(unsafe.success, false);
  assert.match(unsafe.errors.join("\n"), /非脱敏字段/u);
});
