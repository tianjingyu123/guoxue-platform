import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export const bracesPatchHash = "4a580e1663b63e24ca8f3d7a2ce51c4e8d6604ad72d3169f255f7d15baacaa74";
const expectedFiles = {
  "lib/compile.js": "a50d47615f1a412063a104c17fab9b89aed758af75e569616761098f617d1b3e",
  "lib/expand.js": "ad92e3cb8d50e7fbf85b71faa0910135eb6260562ed700fea3d21e8427ccf633",
  "lib/parse.js": "032ff16b3657d9f8d4bbe42347f39f2a0242d9bff660dfd1f65910329bd0438c",
  "lib/stringify.js": "0a41e0c54433820a5f05cf82fbb9cbe0c2bf6805420fe2dca8e6817189a29e0c",
  "lib/depth-guard.js": "d19fcd17f4143a1f0b85ba8a8d15c5231f587a99993e593040134dc68a676f93",
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

// registry或命令返回错误对象时，不得把缺失的漏洞清单误判为零漏洞。
export function validateAuditReport(report) {
  assert(report && typeof report.advisories === "object" && report.advisories !== null);
  assert(!Array.isArray(report.advisories));
  for (const severity of ["critical", "high", "moderate", "low"]) {
    const count = report.metadata?.vulnerabilities?.[severity];
    assert(Number.isInteger(count) && count >= 0);
  }
  return report;
}

export function isSupportedBracesFinding(advisory) {
  const findings = advisory.findings || [];
  return (
    Number(advisory.id) === 1240992 &&
    advisory.module_name === "braces" &&
    findings.length > 0 &&
    findings.every(
      (finding) =>
        finding.version === "3.0.3" &&
        finding.paths?.length > 0 &&
        finding.paths.every(
          (value) =>
            value ===
            "apps__mobile>@dcloudio/uni-app>@dcloudio/uni-cloud>@dcloudio/uni-cli-shared>chokidar>braces",
        ),
    )
  );
}

// 核验实际消费包，不仅核验仓库中声明的补丁；缺文件、摘要变化和行为不符均阻断。
export function verifyBracesPackage(packageDir) {
  assert.equal(JSON.parse(readFileSync(path.join(packageDir, "package.json"))).version, "3.0.3");
  for (const [file, hash] of Object.entries(expectedFiles)) {
    assert.equal(sha(readFileSync(path.join(packageDir, file))), hash, file);
  }
  const braces = createRequire(path.join(packageDir, "package.json"))(
    path.join(packageDir, "index.js"),
  );
  const fixtures = JSON.parse(
    readFileSync(new URL("./braces-ordinary-fixtures.json", import.meta.url)),
  );
  for (const fixture of fixtures)
    assert.deepEqual(braces[fixture.method](fixture.input), fixture.expected);
  const rejection = { name: "SyntaxError", code: "BRACES_AST_DEPTH_LIMIT" };
  for (const method of ["parse", "compile", "expand", "stringify"]) {
    assert.throws(() => braces[method]("{".repeat(4096) + "x" + "}".repeat(4096)), rejection);
  }
  for (const method of ["compile", "expand", "stringify"]) {
    const ast = { type: "root", nodes: [] };
    let node = ast;
    for (let i = 0; i < 14000; i++) {
      const child = { type: "brace", nodes: [] };
      node.nodes.push(child);
      node = child;
    }
    assert.throws(() => braces[method](ast), rejection);
    const cycle = { type: "root", nodes: [] };
    cycle.nodes.push(cycle);
    assert.throws(() => braces[method](cycle), rejection);
  }
  assert.doesNotThrow(() => braces.compile("{".repeat(100) + "x" + "}".repeat(100)));
  return { verified: true, files: 5, ordinaryComparisons: fixtures.length, protectedCases: 10 };
}

export function verifyInstalledBraces(root) {
  const config = JSON.parse(readFileSync(path.join(root, "package.json")));
  assert.equal(config.pnpm?.patchedDependencies?.["braces@3.0.3"], "patches/braces@3.0.3.patch");
  const patch = readFileSync(path.join(root, "patches/braces@3.0.3.patch"), "utf8").replaceAll(
    "\r\n",
    "\n",
  );
  assert.equal(sha(patch), bracesPatchHash);
  assert(
    readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8").includes(
      `patch_hash=${bracesPatchHash}`,
    ),
  );
  let require = createRequire(path.join(root, "apps/mobile/package.json"));
  for (const name of [
    "@dcloudio/uni-app",
    "@dcloudio/uni-cloud",
    "@dcloudio/uni-cli-shared",
    "chokidar",
  ]) {
    require = createRequire(require.resolve(name + "/package.json"));
  }
  return verifyBracesPackage(path.dirname(require.resolve("braces")));
}
