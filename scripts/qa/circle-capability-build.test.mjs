/** 本地构建收口：仅生成编译产物/测试报告，不连接数据库、不运行迁移。 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const server = path.join(root, "apps/server");
const requireServer = createRequire(path.join(server, "package.json"));
function runNode(args, cwd = root, extraEnv = {}) {
  const result = spawnSync(process.execPath, ["--max-old-space-size=8192", ...args], {
    cwd, env: { ...process.env, ...extraEnv }, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 180000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${args[0]} 失败：${result.stderr || result.stdout}`);
}

test("服务端 TypeScript 完整无输出检查", () => {
  runNode([requireServer.resolve("typescript/bin/tsc"), "--noEmit", "--incremental", "false", "-p", "tsconfig.json"], server);
});
test("Nest 服务端构建", () => {
  runNode([requireServer.resolve("@nestjs/cli/bin/nest.js"), "build"], server);
});
test("Prisma schema 只读校验", () => {
  runNode([requireServer.resolve("prisma/build/index.js"), "validate", "--schema", "prisma/schema.prisma"], server,
    { DATABASE_URL: "postgresql://local_validation:unused@127.0.0.1:1/local_validation" });
});
test("完整空库基线由当前 schema 独立重生成比对一致", () => {
  runNode([path.join(root, "scripts/release/audit-database-baseline.mjs")], root,
    { DATABASE_URL: "postgresql://local_validation:unused@127.0.0.1:1/local_validation" });
});
test("Git diff 不含空白错误", () => {
  const result = spawnSync("git", ["diff", "--check"], { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stdout || result.stderr);
});
