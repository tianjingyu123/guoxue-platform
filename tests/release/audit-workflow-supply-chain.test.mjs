import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditWorkflowSupplyChain } from "../../scripts/release/audit-workflow-supply-chain.mjs";

function withRepository(workflows, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "guoxue-workflow-audit-"));
  const workflowRoot = path.join(root, ".github", "workflows");
  fs.mkdirSync(workflowRoot, { recursive: true });

  for (const [name, content] of Object.entries(workflows)) {
    fs.writeFileSync(path.join(workflowRoot, name), content, "utf8");
  }

  try {
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("允许锁定提交 SHA、容器摘要和仓库内本地 Action", () => {
  withRepository(
    {
      "release.yml": `permissions:\n  contents: read\n\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: actions/checkout@${"a".repeat(40)} # v4\n      - uses: ./github-actions/verify\n      - uses: docker://alpine@sha256:${"b".repeat(64)}\n`,
    },
    (root) => {
      const result = auditWorkflowSupplyChain(root);
      assert.equal(result.workflowFiles.length, 1);
      assert.equal(result.runners.length, 1);
      assert.equal(result.references.length, 3);
      assert.deepEqual(result.errors, []);
    },
  );
});

test("拒绝可变版本标签、分支和未锁定容器镜像", () => {
  withRepository(
    {
      "release.yml": `permissions:\n  contents: read\n\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: actions/checkout@v4\n      - uses: owner/action@main\n      - uses: docker://alpine:latest\n`,
    },
    (root) => {
      const result = auditWorkflowSupplyChain(root);
      assert.equal(result.errors.length, 3);
      assert.match(result.errors[0], /actions\/checkout@v4/u);
      assert.match(result.errors[1], /owner\/action@main/u);
      assert.match(result.errors[2], /docker:\/\/alpine:latest/u);
    },
  );
});

test("拒绝缺失顶层权限限制或在顶层授予写权限", () => {
  withRepository(
    {
      "missing.yml": `jobs:\n  verify:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: actions/checkout@${"a".repeat(40)}\n`,
      "broad.yml": `permissions:\n  contents: write\n  packages: write\n\njobs:\n  publish:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: actions/checkout@${"a".repeat(40)}\n`,
    },
    (root) => {
      const result = auditWorkflowSupplyChain(root);
      assert.equal(result.errors.length, 4);
      assert.ok(result.errors.some((error) => error.includes("必须显式设置顶层 permissions")));
      assert.ok(result.errors.some((error) => error.includes("必须包含 contents: read")));
      assert.ok(result.errors.some((error) => error.includes("contents: write")));
      assert.ok(result.errors.some((error) => error.includes("packages: write")));
    },
  );
});

test("拒绝 GitHub 托管运行器跨系统版本漂移", () => {
  withRepository(
    {
      "release.yml": `permissions:\n  contents: read\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@${"a".repeat(40)}\n`,
    },
    (root) => {
      const result = auditWorkflowSupplyChain(root);
      assert.equal(result.errors.length, 1);
      assert.match(result.errors[0], /ubuntu-latest/u);
    },
  );
});

test("统一代码门禁持续执行供应链审计及其回归测试", () => {
  const testDirectory = path.dirname(fileURLToPath(import.meta.url));
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(testDirectory, "..", "..", "package.json"), "utf8"),
  );
  const gate = packageJson.scripts["release:gate:code"];

  assert.match(gate, /pnpm release:audit-workflow-supply-chain/u);
  assert.match(gate, /pnpm release:test-workflow-supply-chain/u);
});
