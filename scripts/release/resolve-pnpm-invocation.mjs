import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function discoverPnpmShims() {
  const where = spawnSync("where.exe", ["pnpm.cmd"], { encoding: "utf8" });
  if (where.status !== 0) return [];
  return String(where.stdout)
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function resolvePnpmInvocation({
  platform = process.platform,
  nodeExecutable = process.execPath,
  npmExecPath = process.env.npm_execpath || "",
  pnpmShims,
} = {}) {
  if (platform !== "win32") return { command: "pnpm", prefix: [], source: "path" };

  const candidates = [];
  if (npmExecPath) candidates.push({ file: npmExecPath, source: "npm_execpath" });

  // Node 官方 Windows 包的 Corepack 可直接由 Node 执行，避免依赖 .cmd shell。
  candidates.push({
    file: path.join(path.dirname(nodeExecutable), "node_modules", "corepack", "dist", "pnpm.js"),
    source: "corepack",
  });

  for (const shim of pnpmShims || discoverPnpmShims()) {
    candidates.push({
      file: path.join(path.dirname(shim), "node_modules", "pnpm", "bin", "pnpm.cjs"),
      source: "pnpm-shim",
    });
  }

  const resolved = candidates.find(({ file }) => file && existsSync(file));
  if (!resolved) return null;
  return { command: nodeExecutable, prefix: [resolved.file], source: resolved.source };
}
