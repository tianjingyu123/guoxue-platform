import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolvePnpmInvocation } from "../../scripts/release/resolve-pnpm-invocation.mjs";

async function temporaryNodeLayout(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "guoxue-pnpm-resolver-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const nodeExecutable = path.join(directory, "node.exe");
  await writeFile(nodeExecutable, "", "utf8");
  return { directory, nodeExecutable };
}

test("Windows 构建机可直接使用 Node 同目录的 Corepack pnpm 入口", async (t) => {
  const { directory, nodeExecutable } = await temporaryNodeLayout(t);
  const corepackPnpm = path.join(directory, "node_modules", "corepack", "dist", "pnpm.js");
  await mkdir(path.dirname(corepackPnpm), { recursive: true });
  await writeFile(corepackPnpm, "", "utf8");

  const result = resolvePnpmInvocation({
    platform: "win32",
    nodeExecutable,
    npmExecPath: "",
    pnpmShims: [],
  });
  assert.deepEqual(result, {
    command: nodeExecutable,
    prefix: [corepackPnpm],
    source: "corepack",
  });
});

test("当前 pnpm 运行时入口优先于 Corepack 兜底", async (t) => {
  const { directory, nodeExecutable } = await temporaryNodeLayout(t);
  const currentPnpm = path.join(directory, "active-pnpm.cjs");
  await writeFile(currentPnpm, "", "utf8");

  const result = resolvePnpmInvocation({
    platform: "win32",
    nodeExecutable,
    npmExecPath: currentPnpm,
    pnpmShims: [],
  });
  assert.equal(result.source, "npm_execpath");
  assert.deepEqual(result.prefix, [currentPnpm]);
});

test("缺少所有直接入口时返回 null，由正式门禁明确阻断", async (t) => {
  const { nodeExecutable } = await temporaryNodeLayout(t);
  const result = resolvePnpmInvocation({
    platform: "win32",
    nodeExecutable,
    npmExecPath: "",
    pnpmShims: [],
  });
  assert.equal(result, null);
});

test("Linux 构建机继续使用 PATH 中的 pnpm", () => {
  assert.deepEqual(resolvePnpmInvocation({ platform: "linux" }), {
    command: "pnpm",
    prefix: [],
    source: "path",
  });
});
