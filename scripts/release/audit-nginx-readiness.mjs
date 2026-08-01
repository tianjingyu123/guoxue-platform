#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

const templates = [
  {
    name: "直连 HTTPS",
    file: "docker/nginx/nginx.conf.template",
    forwardedProto: "$scheme",
  },
  {
    name: "CLB 回源",
    file: "docker/nginx/nginx.clb.conf.template",
    forwardedProto: "$real_scheme",
  },
];

const checks = [];
const add = (template, name, pass, detail) => checks.push({ template, name, pass, detail });

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function hasAll(source, snippets) {
  return snippets.every((snippet) => source.includes(snippet));
}

function extractLocationBlocks(source) {
  const blocks = [];
  const matcher = /\blocation\b[^\{]*\{/gu;
  for (const match of source.matchAll(matcher)) {
    const start = match.index;
    const openingBrace = source.indexOf("{", start);
    let depth = 0;
    for (let index = openingBrace; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) {
        blocks.push(source.slice(start, index + 1));
        break;
      }
    }
  }
  return blocks;
}

const securityInclude = "include /etc/nginx/snippets/security-headers.conf;";
const securityHeaders = read("docker/nginx/security-headers.conf");

add(
  "公共",
  "安全响应头片段完整",
  hasAll(securityHeaders, [
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ]),
  "直连 HTTPS 与 CLB 回源共用一份安全响应头基线",
);

add(
  "部署编排",
  "安全响应头片段只读挂载",
  [
    "docker/docker-compose.yml",
    "docker/docker-compose.prod.yml",
    "docker/docker-compose.tencent.yml",
  ].every((file) =>
    read(file).includes(
      "./nginx/security-headers.conf:/etc/nginx/snippets/security-headers.conf:ro",
    ),
  ),
  "任何部署架构均不能因缺少 include 文件导致 Nginx 启动失败",
);

for (const template of templates) {
  const source = read(template.file);
  const customHeaderLocations = extractLocationBlocks(source).filter((block) =>
    block.includes("add_header "),
  );

  add(
    template.name,
    "入口斜杠归一化",
    hasAll(source, ["location = /h5 {", "/h5/;", "location = /admin {", "/admin/;"]),
    "避免 /h5 与 /admin 被 SPA 前缀规则误处理",
  );

  add(
    template.name,
    "自定义缓存头不覆盖安全头",
    source.includes(securityInclude) &&
      customHeaderLocations.length > 0 &&
      customHeaderLocations.every((block) => block.includes(securityInclude)),
    "Nginx location 一旦声明 add_header 就停止继承上级，必须显式合并公共安全头",
  );

  add(
    template.name,
    "H5 与管理端支持 SPA 回退",
    hasAll(source, [
      "try_files $uri $uri/ /h5/index.html;",
      "try_files $uri $uri/ /admin/index.html;",
    ]),
    "刷新深层路由不能返回 404",
  );

  add(
    template.name,
    "HTML 禁止缓存、指纹资源长期缓存",
    hasAll(source, [
      "location /h5/assets/",
      "location ~ ^/admin/assets/",
      'add_header Cache-Control "public, immutable";',
      'add_header Cache-Control "no-cache";',
    ]),
    "域名切换和版本发布后不能长期命中旧 HTML",
  );

  add(
    template.name,
    "API 与健康检查已回源",
    hasAll(source, [
      "location /api/v1/health",
      "location /api/",
      "proxy_pass http://server_backend;",
    ]),
    "负载均衡和应用探针必须能区分进程存活与 API 可用",
  );

  add(
    template.name,
    "WebSocket 实时链路完整",
    hasAll(source, [
      "location /socket.io/",
      "proxy_set_header Upgrade $http_upgrade;",
      'proxy_set_header Connection "upgrade";',
      "proxy_read_timeout 86400s;",
      "proxy_buffering off;",
      `proxy_set_header X-Forwarded-Proto ${template.forwardedProto};`,
    ]),
    "语音通话、消息和实时状态不能退化为普通 HTTP",
  );

  add(
    template.name,
    "服务端只暴露声明的域名",
    source.includes("server_name ${NGINX_SERVER_NAMES};") && !/server_name\s+_;/.test(source),
    "防止新服务器 IP 或未备案 Host 绕过正式域名策略",
  );
}

console.log("Nginx 迁移与上线门禁");
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} [${item.template}] ${item.name}：${item.detail}`);
}

const failed = checks.filter((item) => !item.pass);
console.log(`\n结果：${checks.length - failed.length}/${checks.length} 通过`);
if (failed.length > 0) {
  process.exitCode = 1;
}
