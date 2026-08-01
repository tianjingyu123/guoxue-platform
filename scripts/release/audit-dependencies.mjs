#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const acceptedAdvisories = new Map([
  [
    1123525,
    {
      moduleName: "vite",
      titleIncludes: "server.fs.deny",
      allowedPaths: [
        "apps__mobile>vite",
        "apps__mobile>@dcloudio/uni-app-plus>@dcloudio/uni-app-vite>@vitejs/plugin-vue>vite",
        "apps__mobile>@dcloudio/uni-app-harmony>@dcloudio/uni-app-vite>@vitejs/plugin-vue>vite",
      ],
      reason:
        "当前 DCloud 构建链固定使用 Vite 5，此漏洞仅影响 Vite 开发服务器的文件访问控制；生产环境只允许部署构建产物，严禁将 Vite dev/preview 暴露到公网。待 DCloud 支持 Vite >= 6.4.3 后立即移除例外。",
    },
  ],
]);

function runAudit() {
  const command =
    process.platform === "win32"
      ? [process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "pnpm audit --prod --json"]]
      : ["pnpm", ["audit", "--prod", "--json"]];
  const result = spawnSync(command[0], command[1], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    console.error(`依赖审计无法启动：${result.error.message}`);
    process.exit(2);
  }

  const output = result.stdout || "";
  const jsonStart = output.indexOf("{");
  if (jsonStart < 0) {
    console.error("依赖审计没有返回可解析的 JSON。");
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(2);
  }

  try {
    return JSON.parse(output.slice(jsonStart));
  } catch (error) {
    console.error(`依赖审计结果解析失败：${error.message}`);
    process.exit(2);
  }
}

function isAccepted(advisory) {
  const rule = acceptedAdvisories.get(Number(advisory.id));
  if (!rule) return false;
  if (advisory.module_name !== rule.moduleName) return false;
  if (!String(advisory.title || "").includes(rule.titleIncludes)) return false;

  const paths = (advisory.findings || []).flatMap((finding) => finding.paths || []);
  return (
    paths.length > 0 &&
    paths.every((item) => rule.allowedPaths.includes(item))
  );
}

const audit = runAudit();
const advisories = Object.values(audit.advisories || {});
const blocking = advisories.filter(
  (item) =>
    (item.severity === "high" || item.severity === "critical") &&
    !isAccepted(item),
);
const accepted = advisories.filter(
  (item) =>
    (item.severity === "high" || item.severity === "critical") &&
    isAccepted(item),
);
const metadata = audit.metadata?.vulnerabilities || {};

console.log(
  `生产依赖审计：critical=${metadata.critical || 0} high=${metadata.high || 0} moderate=${metadata.moderate || 0} low=${metadata.low || 0}`,
);

for (const advisory of accepted) {
  const rule = acceptedAdvisories.get(Number(advisory.id));
  console.log(`已接受的临时例外：#${advisory.id} ${advisory.module_name}`);
  console.log(`  ${rule.reason}`);
}

for (const advisory of blocking) {
  console.error(
    `阻断：#${advisory.id} ${advisory.module_name} [${advisory.severity}] ${advisory.title}`,
  );
}

if (blocking.length > 0) {
  console.error(`依赖安全门禁未通过：发现 ${blocking.length} 个未获批准的高危或严重漏洞。`);
  process.exit(1);
}

console.log("依赖安全门禁通过：没有未获批准的高危或严重漏洞。");
