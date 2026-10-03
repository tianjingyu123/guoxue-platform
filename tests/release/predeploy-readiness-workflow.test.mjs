import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const workflow = readFileSync(
  path.join(repoRoot, ".github/workflows/predeploy-readiness.yml"),
  "utf8",
).replace(/\r\n?/gu, "\n");

test("预接入工作流只能手动触发且受 production Environment 保护", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/mu);
  assert.doesNotMatch(workflow, /^\s+(?:push|pull_request|schedule):/mu);
  assert.match(workflow, /environment:\n\s+name: production/u);
  assert.match(workflow, /permissions:\n\s+contents: read/u);
  assert.match(workflow, /DISPATCH_OPERATION: predeploy/u);
  assert.match(workflow, /validate-production-dispatch\.mjs/u);
});

test("预接入工作流只读运行且禁止迁移、SSH、部署和 DNS 修改通道", () => {
  assert.match(workflow, /RUN_MIGRATION: "false"/u);
  assert.match(workflow, /release:gate:predeploy/u);
  assert.doesNotMatch(workflow, /appleboy\/(?:ssh|scp)-action/iu);
  assert.doesNotMatch(
    workflow,
    /(?:prisma\s+migrate|activate-fixed-release|rollback-fixed-release|docker\s+(?:compose|stack)|dnsapi|dnspod)/iu,
  );
});

test("正式输入只写入 0600 临时文件并在任意结果下删除", () => {
  assert.match(
    workflow,
    /PRODUCTION_ENV_FILE_CONTENT: \$\{\{ secrets\.PRODUCTION_ENV_FILE_CONTENT \}\}/u,
  );
  assert.match(
    workflow,
    /INFRASTRUCTURE_INTAKE_FILE_CONTENT: \$\{\{ secrets\.INFRASTRUCTURE_INTAKE_FILE_CONTENT \}\}/u,
  );
  assert.match(workflow, /umask 077/u);
  assert.match(workflow, /chmod 0600/u);
  assert.match(workflow, /name: 删除临时受控输入文件\n\s+if: always\(\)/u);
  assert.match(workflow, /rm -f --/u);
  assert.doesNotMatch(workflow, /set -x/u);
});

test("子门禁失败仍归档安全的统一判定，非脱敏报告拒绝上传，随后显式失败", () => {
  assert.match(workflow, /continue-on-error: true/u);
  assert.match(workflow, /name: 确认统一判定可安全归档/u);
  assert.match(workflow, /--safety-only/u);
  assert.match(
    workflow,
    /name: 保存统一脱敏预接入判定\n\s+if: always\(\) && steps\.evidence_safety\.outcome == 'success'/u,
  );
  assert.match(workflow, /path: artifacts\/release-audit\/predeploy-ci\/predeploy-decision\.json/u);
  assert.doesNotMatch(workflow, /path: artifacts\/release-audit\/predeploy-ci\s*$/mu);
  assert.match(workflow, /GATE_OUTCOME: \$\{\{ steps\.predeploy_gate\.outcome \}\}/u);
  assert.match(workflow, /verify-predeploy-decision\.mjs/u);
});
