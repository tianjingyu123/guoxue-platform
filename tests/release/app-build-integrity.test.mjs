import test from "node:test";
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

function fixture(compilerFails, produceFiles) {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "rebu-app-build-"));
  const root = path.join(temporary, "apps/mobile");
  const write = (file, content) => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  write(path.join(root, "package.json"), '{"private":true}');
  mkdirSync(path.join(root, "scripts"), { recursive: true });
  cpSync(
    new URL("../../apps/mobile/scripts/build-app.mjs", import.meta.url),
    path.join(root, "scripts/build-app.mjs"),
  );
  const shared = path.join(root, "node_modules/@dcloudio/uni-cli-shared");
  write(path.join(shared, "package.json"), '{"main":"index.js"}');
  write(
    path.join(shared, "index.js"),
    compilerFails
      ? 'exports.resolveUTSCompiler=()=>{throw new Error("合成Linux原生编译器缺失")}'
      : "exports.resolveUTSCompiler=()=>({})",
  );
  const cli = path.join(root, "node_modules/@dcloudio/vite-plugin-uni");
  write(path.join(cli, "package.json"), '{"bin":{"uni":"bin/uni.js"}}');
  write(
    path.join(cli, "bin/uni.js"),
    produceFiles
      ? 'const fs=require("fs");fs.mkdirSync("dist/build/app",{recursive:true});for(const name of ["app-service.js","app-config-service.js","manifest.json","__uniappview.html"])fs.writeFileSync("dist/build/app/"+name,"合成产物");'
      : "process.exit(0)",
  );
  write(path.join(root, "dist/build/app/app-service.js"), "上轮残留不应遮盖本轮失败");
  return {
    temporary,
    root,
    run: () =>
      spawnSync(process.execPath, ["scripts/build-app.mjs"], {
        cwd: root,
        encoding: "utf8",
        timeout: 15000,
      }),
  };
}
function close(project) {
  assert.equal(path.dirname(path.resolve(project.temporary)), path.resolve(os.tmpdir()));
  assert(path.basename(project.temporary).startsWith("rebu-app-build-"));
  rmSync(project.temporary, { recursive: true, force: true });
}
test("编译器加载失败会阻断，且不清理尚未开始构建的现场", () => {
  const project = fixture(true, false);
  try {
    const result = project.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /合成Linux原生编译器缺失/);
    assert(existsSync(path.join(project.root, "dist/build/app/app-service.js")));
  } finally {
    close(project);
  }
});
test("SDK退出0但缺少成品时阻断，旧app-service不能蒙混通过", () => {
  const project = fixture(false, false);
  try {
    const result = project.run();
    assert.notEqual(result.status, 0);
    assert(!existsSync(path.join(project.root, "dist/build/app/app-service.js")));
  } finally {
    close(project);
  }
});
test("真实执行编译进程并生成四个必要成品后才成功", () => {
  const project = fixture(false, true);
  try {
    const result = project.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /资源完整性检查通过/);
    assert.equal(
      readFileSync(path.join(project.root, "dist/build/app/app-service.js"), "utf8"),
      "合成产物",
    );
  } finally {
    close(project);
  }
});
