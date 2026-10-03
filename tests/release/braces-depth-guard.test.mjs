import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  isSupportedBracesFinding,
  verifyBracesPackage,
  validateAuditReport,
} from "../../scripts/release/lib/braces-depth-guard.mjs";

const require = createRequire(import.meta.url);
const packageDir =
  process.env.BRACES_PATCH_TEST_PACKAGE_DIR ||
  path.dirname(
    require.resolve("braces", { paths: [path.resolve("node_modules/.pnpm/node_modules")] }),
  );
test("审计失败或结构缺失不能误报为安全通过", () => {
  const report = {
    advisories: {},
    metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } },
  };
  assert.equal(validateAuditReport(report), report);
  assert.throws(() => validateAuditReport({ error: "registry不可用" }));
  assert.throws(() => validateAuditReport({ ...report, metadata: {} }));
  assert.throws(() => validateAuditReport({ ...report, advisories: [] }));
});
test("实际安装补丁保护公开入口并保持30组合法模式", () => {
  assert.deepEqual(verifyBracesPackage(packageDir), {
    verified: true,
    files: 5,
    ordinaryComparisons: 30,
    protectedCases: 10,
  });
});
test("安装内容被替换时不能借补丁声明放行", () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "rebu-braces-verify-"));
  try {
    const copied = path.join(temporary, "package");
    cpSync(realpathSync(packageDir), copied, { recursive: true });
    const parse = path.join(copied, "lib/parse.js");
    writeFileSync(parse, readFileSync(parse, "utf8") + "\n// 合成摘要篡改\n");
    assert.throws(() => verifyBracesPackage(copied));
  } finally {
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert(path.basename(temporary).startsWith("rebu-braces-verify-"));
    rmSync(temporary, { recursive: true, force: true });
  }
});
test("仅认可已核对的漏洞、版本和实际依赖路径", () => {
  const finding = {
    version: "3.0.3",
    paths: [
      "apps__mobile>@dcloudio/uni-app>@dcloudio/uni-cloud>@dcloudio/uni-cli-shared>chokidar>braces",
    ],
  };
  const advisory = { id: 1240992, module_name: "braces", findings: [finding] };
  assert.equal(isSupportedBracesFinding(advisory), true);
  assert.equal(isSupportedBracesFinding({ ...advisory, id: 1 }), false);
  assert.equal(
    isSupportedBracesFinding({ ...advisory, findings: [{ ...finding, version: "2.0.0" }] }),
    false,
  );
  assert.equal(
    isSupportedBracesFinding({
      ...advisory,
      findings: [{ ...finding, paths: ["apps__server>unverified>braces"] }],
    }),
    false,
  );
  assert.equal(isSupportedBracesFinding({ ...advisory, findings: [] }), false);
});
