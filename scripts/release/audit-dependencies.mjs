#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  isSupportedBracesFinding,
  verifyInstalledBraces,
  validateAuditReport,
} from "./lib/braces-depth-guard.mjs";

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
    timeout: 120000,
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
    if (result.status !== 0 && result.status !== 1) throw new Error("审计命令未正常完成");
    return validateAuditReport(JSON.parse(output.slice(jsonStart)));
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
  return paths.length > 0 && paths.every((item) => rule.allowedPaths.includes(item));
}

const audit = runAudit();
const advisories = Object.values(audit.advisories || {});
// npm版本尚未修复时，只认可范围固定且安装后的源码与防护行为均实测的本地补丁。
const locallyFixed = [];
for (const advisory of advisories.filter(isSupportedBracesFinding)) {
  try {
    verifyInstalledBraces(process.cwd());
    locallyFixed.push(advisory);
  } catch {
    console.error("braces本地补丁缺失、安装内容或防护行为未通过核验，继续阻断。");
  }
}
const blocking = advisories.filter(
  (item) =>
    (item.severity === "high" || item.severity === "critical") &&
    !isAccepted(item) &&
    !locallyFixed.includes(item),
);
const accepted = advisories.filter(
  (item) => (item.severity === "high" || item.severity === "critical") && isAccepted(item),
);
const metadata = audit.metadata?.vulnerabilities || {};
const print = (message) => process.stdout.write(message + "\n");

print(
  `生产依赖审计：critical=${metadata.critical || 0} high=${metadata.high || 0} moderate=${metadata.moderate || 0} low=${metadata.low || 0}`,
);

for (const advisory of accepted) {
  const rule = acceptedAdvisories.get(Number(advisory.id));
  print(`已接受的临时例外：#${advisory.id} ${advisory.module_name}`);
  print(`  ${rule.reason}`);
}

for (const advisory of locallyFixed) {
  print(
    `已核实本地安全补丁：#${advisory.id} braces，固定消费路径、五文件摘要及深度保护实测通过；不代表上游已发布修复版。`,
  );
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

print("依赖安全门禁通过：没有未处理的高危或严重漏洞；临时例外与已验证本地修复见上述明细。");
