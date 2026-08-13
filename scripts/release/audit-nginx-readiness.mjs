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
    unknownHostSnippets: [
      "listen 80 default_server;",
      "listen 443 ssl default_server;",
      "ssl_reject_handshake on;",
      "return 444;",
    ],
    defaultHealthPaths: [
      "/nginx-health",
      "/api/v1/health",
      "/api/v1/health/live",
      "/api/v1/health/ready",
    ],
  },
  {
    name: "CLB 回源",
    file: "docker/nginx/nginx.clb.conf.template",
    forwardedProto: "$real_scheme",
    unknownHostSnippets: ["listen 80 default_server;", "return 444;"],
    defaultHealthPaths: [
      "/nginx-health",
      "/api/v1/health",
      "/api/v1/health/live",
      "/api/v1/health/ready",
    ],
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

function extractDirectiveBlocks(source, directive) {
  const blocks = [];
  const matcher = new RegExp(`\\b${directive}\\b[^\\{]*\\{`, "gu");
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

function extractLocationBlocks(source) {
  return extractDirectiveBlocks(source, "location");
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
  "公共",
  "代理响应安全头去重",
  hasAll(securityHeaders, [
    "proxy_hide_header Strict-Transport-Security;",
    "proxy_hide_header X-Frame-Options;",
    "proxy_hide_header X-Content-Type-Options;",
    "proxy_hide_header Referrer-Policy;",
    "proxy_hide_header Permissions-Policy;",
  ]),
  "Helmet 与 Nginx 同时启用时只保留入口统一生成的一份安全响应头",
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
  const defaultServer = extractDirectiveBlocks(source, "server").find((block) =>
    block.includes("default_server"),
  );
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
    "Prometheus 指标禁止公网访问",
    source.includes("location = /api/v1/metrics {") &&
      extractLocationBlocks(source).some(
        (block) =>
          block.includes("location = /api/v1/metrics {") &&
          block.includes("return 404;") &&
          !block.includes("proxy_pass"),
      ),
    "Prometheus 通过 Docker 内网直连应用抓取，公网 Nginx 不应暴露运行指标",
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
    "未知 Host 由默认站点拒绝",
    source.includes("server_name ${NGINX_SERVER_NAMES};") &&
      source.includes('server_name "";') &&
      hasAll(source, template.unknownHostSnippets) &&
      Boolean(defaultServer) &&
      defaultServer.includes("location / {") &&
      defaultServer.includes("return 444;") &&
      template.defaultHealthPaths.every((healthPath) =>
        defaultServer.includes(`location = ${healthPath} {`),
      ),
    "只允许声明域名访问业务接口，同时精确保留容器和负载均衡健康探针",
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
