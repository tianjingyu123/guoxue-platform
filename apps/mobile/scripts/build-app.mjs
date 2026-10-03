import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstatSync, statSync, rmSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(path.join(root, "package.json"));
process.env.UNI_CLI_CONTEXT = root;
// SDK遇到编译器加载失败会退出0；在启动前显式核验，避免吞掉底层错误。
require("@dcloudio/uni-cli-shared").resolveUTSCompiler(true);
const output = path.resolve(root, "dist/build/app");
assert.equal(path.relative(root, output), path.join("dist", "build", "app"));
let existing;
try {
  existing = lstatSync(output);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
assert(!existing?.isSymbolicLink(), "拒绝清理符号链接指向的非本任务产物");
if (existing)
  assert(
    realpathSync(output).startsWith(path.resolve(realpathSync(root)) + path.sep),
    "生成目录解析后越出项目",
  );
// 仅清理明确生成目录，避免旧产物掩盖这次构建失败。
rmSync(output, { recursive: true, force: true });
const cli = require.resolve("@dcloudio/vite-plugin-uni/bin/uni.js");
const result = spawnSync(process.execPath, [cli, "build", "-p", "app"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
for (const file of [
  "app-service.js",
  "app-config-service.js",
  "manifest.json",
  "__uniappview.html",
]) {
  const information = statSync(path.join(output, file));
  assert(information.isFile() && information.size > 0, `APP资源缺失或为空：${file}`);
}
process.stdout.write("APP入口、配置、manifest和视图资源完整性检查通过\n");
