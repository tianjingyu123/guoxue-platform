#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const checks = [];
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
const add = (name, pass, detail) => checks.push({ name, pass, detail });
const hasAll = (source, snippets) => snippets.every((snippet) => source.includes(snippet));

const monitoringCompose = read("docker/monitoring/docker-compose.yml");
const productionCompose = read("docker/docker-compose.prod.yml");
const tencentCompose = read("docker/docker-compose.tencent.yml");
const prometheus = read("docker/monitoring/prometheus.yml");
const blackbox = read("docker/monitoring/blackbox.yml");
const alerts = read("docker/monitoring/alert-rules.yml");
const alertmanagerTemplate = read("docker/monitoring/alertmanager.yml.template");
const renderer = read("scripts/release/render-monitoring-config.mjs");
const deployMonitoring = read("scripts/operations/deploy-monitoring-config.sh");
const setupServer = read("docker/setup-server.sh");
const envExample = read("docker/.env.production.example");
const packageJson = read("package.json");

add(
  "应用指标采集命中真实 NestJS 路径",
  hasAll(prometheus, [
    'job_name: "guoxue-server"',
    'metrics_path: "/api/v1/metrics"',
    '"guoxue-server:3000"',
  ]) && !prometheus.includes("host.docker.internal"),
  "Prometheus 必须通过 Linux 容器 DNS 采集 /api/v1/metrics",
);

add(
  "平台三条用户入口持续拨测",
  hasAll(prometheus, [
    'job_name: "blackbox-platform"',
    "http://guoxue-nginx/api/v1/health/ready",
    "http://guoxue-nginx/h5/",
    "http://guoxue-nginx/admin/",
  ]),
  "API、H5 与管理后台任一不可达都应进入告警链路",
);

add(
  "第三方拨测区分可达性与业务成功",
  hasAll(blackbox, ["http_reachable:", "valid_status_codes:", "400, 401, 403, 404, 405, 429"]) &&
    hasAll(prometheus, ['job_name: "blackbox-external"', 'module: ["http_reachable"]']),
  "鉴权类 API 根地址返回 4xx 仍可证明 DNS、TLS 和网络可达",
);

add(
  "黑盒告警表达式与采集任务同名",
  hasAll(alerts, [
    'probe_success{job="blackbox-external"} == 0',
    'probe_success{job="blackbox-platform"} == 0',
    "PlatformEntryUnreachable",
    "PrometheusTargetDown",
  ]) && !alerts.includes('job="guoxue-external-probes"'),
  "避免探测失败但告警规则永远匹配不到时序数据",
);

add(
  "自有公网证书到期提前告警",
  hasAll(prometheus, [
    'job_name: "blackbox-tls"',
    '"${PUBLIC_API_URL}/api/v1/health/live"',
    '"${PUBLIC_ASSET_ORIGIN}/"',
    'env: "production"',
  ]) &&
    hasAll(alerts, [
      'probe_ssl_earliest_cert_expiry{job="blackbox-tls"}',
      "TLSCertificateReplacementPlanning",
      "TLSCertificateExpiringSoon",
      "TLSCertificateExpiringCritical",
      "60 * 24 * 60 * 60",
      "30 * 24 * 60 * 60",
      "14 * 24 * 60 * 60",
      "免费证书通常需在到期前 30 天进入快速续期后重新申请",
      "DNS 不在证书供应商托管时必须人工完成 DNS 验证",
      "立即启用人工签发与部署兜底",
      "以公网实际证书到期时间验收",
    ]),
  "API 与 CDN 证书必须在 60、30、14 天阈值触发准备、执行和人工兜底三级告警，且不得把免费证书误判为无人值守自动续期",
);

add(
  "生产应用与监控栈共享显式外部网络",
  (productionCompose.match(/- monitoring/g) || []).length >= 4 &&
    productionCompose.includes("monitoring:\n    external: true") &&
    monitoringCompose.includes("monitoring:\n    external: true") &&
    tencentCompose.includes("monitoring:\n    external: true") &&
    !tencentCompose.includes("networks: !override"),
  "Server、Nginx、PostgreSQL、Redis 与监控容器必须在同一命名网络中按需互通；腾讯云覆盖层不得移除该网络",
);

add(
  "Exporter 跟随真实生产连接配置",
  hasAll(monitoringCompose, ["DATA_SOURCE_NAME: ${DATABASE_URL:", "REDIS_ADDR: ${REDIS_URL:"]) &&
    !monitoringCompose.includes("guoxue123") &&
    !monitoringCompose.includes("host.docker.internal"),
  "禁止监控连接硬编码旧密码、旧主机或本机空库",
);

const publicPortPattern = /^\s+-\s+"(?!127\.0\.0\.1:)\d+:\d+"/m;
add(
  "监控端口不直接暴露公网",
  !publicPortPattern.test(monitoringCompose),
  "Prometheus、Grafana、Alertmanager 与 Loki 仅绑定回环地址，其余组件仅走容器网络",
);

add(
  "Grafana 拒绝默认弱口令",
  monitoringCompose.includes(
    "GF_SECURITY_ADMIN_PASSWORD: ${GF_ADMIN_PASSWORD:?生产监控必须设置 GF_ADMIN_PASSWORD}",
  ) && !monitoringCompose.includes("guoxue2026"),
  "生产监控后台必须由环境文件提供强密码",
);

add(
  "Alertmanager 使用渲染后的私密配置",
  monitoringCompose.includes(
    "./.generated/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro",
  ) &&
    monitoringCompose.includes(
      "./.generated/prometheus.yml:/etc/prometheus/prometheus.yml:ro",
    ) &&
    !fs.existsSync(path.join(repoRoot, "docker/monitoring/alertmanager.yml")),
  "禁止把含占位符的模板直接交给 Alertmanager 或 Prometheus",
);

add(
  "告警配置渲染不泄露凭据",
  hasAll(renderer, [
    "WEWORK_CORP_ID",
    "WEWORK_AGENT_ID",
    "WEWORK_AGENT_SECRET",
    "DBA_WEWORK_USER_IDS",
    "PUBLIC_API_URL",
    "PUBLIC_ASSET_ORIGIN",
    "prometheusOutputFile",
    "normalizePublicHttpsUrl",
    "escapeYamlDoubleQuoted",
    "mode: 0o640",
    "chmod(outputFile, 0o640)",
  ]) &&
    !renderer.includes("console.log(values") &&
    !renderer.includes("console.log(rendered"),
  "渲染器只报告文件路径，生成文件权限为 0640，允许容器运行组只读访问",
);

add(
  "Alertmanager 路由采用当前 matcher 语法",
  hasAll(alertmanagerTemplate, [
    "matchers:",
    "source_matchers:",
    "target_matchers:",
    "category = database",
  ]) && !/\bsource_match:|\btarget_match:|\btarget_match_re:/.test(alertmanagerTemplate),
  "数据库告警优先进入 DBA 接收者，避免被通用严重级别路由提前截获",
);

add(
  "完整上线环境要求监控与值班凭据",
  hasAll(envExample, [
    "MONITORING_ENABLED=true",
    "GF_ADMIN_PASSWORD=",
    "WEWORK_CORP_ID=",
    "WEWORK_AGENT_ID=",
    "WEWORK_AGENT_SECRET=",
    "DBA_WEWORK_USER_IDS=",
  ]),
  "新服务器切流前必须明确 Grafana 与企业微信自建应用配置",
);

add(
  "监控门禁已接入统一发布门禁",
  packageJson.includes('"release:audit-monitoring"') &&
    packageJson.includes("pnpm release:audit-monitoring"),
  "每次发布自动阻断路径、网络、端口与告警配置回归",
);

add(
  "监控配置部署处理 bind mount inode 替换",
  hasAll(deployMonitoring, [
    "promtool",
    "trap rollback ERR",
    "render-monitoring-config.mjs",
    ".generated/prometheus.yml",
    "up -d --force-recreate prometheus blackbox-exporter",
    "业务指标采集",
    "TLS 到期指标",
  ]),
  "原子替换配置后必须只重建直接挂载配置的 Prometheus 与 Blackbox 容器，回退路径也必须重新加载旧配置",
);

add(
  "新服务器安装流程等待监控真实就绪",
  hasAll(setupServer, [
    "render-monitoring-config.mjs",
    "monitoring/docker-compose.yml",
    "http://127.0.0.1:9090/-/ready",
    "http://127.0.0.1:9093/-/ready",
    "http://127.0.0.1:3001/api/health",
    "guoxue-monitoring.service",
    "服务启动或运行版本确认超时，请检查",
    "监控栈启动超时，请检查",
    "scripts/release/current-compose.sh",
    'if [ "$NODE_ROLE" = "operations" ]; then',
    "systemctl enable guoxue.service",
    "systemctl enable guoxue-monitoring.service",
    "systemctl disable --now guoxue-monitoring.service",
    "label=com.docker.compose.project=monitoring",
    "docker rm -f",
    "业务节点：已停止重复监控栈，保留数据卷与镜像",
    "业务节点：跳过监控栈启动",
  ]) && (setupServer.match(/exit 1/g) || []).length >= 3,
  "运维节点必须完成配置渲染、容器启动、三组件健康等待和 systemd 自启动；业务节点必须删除重复监控容器但保留数据卷与镜像",
);

console.log("监控与告警上线门禁");
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}：${item.detail}`);
}

const failed = checks.filter((item) => !item.pass);
console.log(`\n结果：${checks.length - failed.length}/${checks.length} 通过`);
if (failed.length > 0) process.exitCode = 1;
