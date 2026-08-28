#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass, detail });

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n?/gu, "\n");
}

function readOptional(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return fs.existsSync(absolutePath) ? read(relativePath) : "";
}

function hasAll(source, snippets) {
  return snippets.every((snippet) => source.includes(snippet));
}

function countOccurrences(source, snippet) {
  return source.split(snippet).length - 1;
}

function hasDirectShellScriptCommand(source) {
  return /^(?!\s*#)(?:\s*[A-Z_][A-Z0-9_]*=(?:"[^"\n]*"|'[^'\n]*'|\S+)\s+)*\s*(?:\.{0,2}\/|\/)[^\s`]+\.sh(?:\s|$)/mu.test(
    source,
  );
}

const gitAttributes = read(".gitattributes");
add(
  "Linux 运维脚本在 Windows 提交后仍固定使用 LF 换行",
  /^\s*\*\.sh\s+text\s+eol=lf\s*$/mu.test(gitAttributes),
  "Windows 工作树提交的 Shell 脚本必须由 Git 在 Linux 构建机检出为 LF，避免迁移当天因 CRLF 无法执行",
);

const shellScripts = [
  "apps/server/prisma/migrations-deploy/bootstrap-empty-database.sh",
  "scripts/migration/export-postgres.sh",
  "scripts/migration/restore-postgres.sh",
  "scripts/migration/verify-postgres.sh",
  "scripts/migration/run-prisma-migrations.sh",
  "scripts/migration/smoke-test.sh",
  "docker/pg-backup.sh",
  "docker/pg-restore.sh",
  "docker/renew-ssl.sh",
  "docker/nginx/setup-ssl.sh",
  "docker/setup-server.sh",
  "docker/deploy.sh",
  "scripts/release/activate-fixed-release.sh",
  "scripts/release/rollback-fixed-release.sh",
  "scripts/release/preflight-host.sh",
  "scripts/release/validate-release-layout.sh",
  "scripts/release/verify-production-cutover.sh",
  "scripts/release/current-compose.sh",
  "scripts/operations/deploy-nginx-clb-config.sh",
  "scripts/operations/deploy-monitoring-config.sh",
  "scripts/operations/probe-clb-failover.sh",
  "scripts/operations/cleanup-docker-retention.sh",
  "scripts/db-ops.sh",
  "scripts/backup-db.sh",
  "scripts/restore-db.sh",
];
const bash = process.platform === "win32" ? "bash.exe" : "bash";
for (const relativePath of shellScripts) {
  const result = spawnSync(bash, ["-n", relativePath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  add(
    `Shell 语法：${relativePath}`,
    result.status === 0,
    result.status === 0
      ? "可由标准 Bash 解析"
      : (result.stderr || result.error?.message || "语法检查失败").trim(),
  );
}

const nginxClbDeploy = read("scripts/operations/deploy-nginx-clb-config.sh");
const clbFailoverProbe = read("scripts/operations/probe-clb-failover.sh");
const tencentCloudAudit = read("scripts/operations/audit-tencent-cloud-readiness.py");
const setupServer = read("docker/setup-server.sh");
const dockerCleanup = read("scripts/operations/cleanup-docker-retention.sh");
const standardTlsRenewal = read("docker/renew-ssl.sh");
const standardTlsBootstrap = read("docker/nginx/setup-ssl.sh");
add(
  "standard 架构证书续期可演练、可串行并在失败时恢复入口",
  hasAll(standardTlsRenewal, [
    'DEPLOY_TARGET" != "standard"',
    "flock -n 9",
    'openssl x509 -checkend "$RENEW_BEFORE_SECONDS"',
    "certbot_args+=(--dry-run)",
    "certbot/certbot:v3.2.0@sha256:3ad1eb352f6b2ae3f359dce4b262f699cc178be0ab9d9f375210e8741404720e",
    "trap restore_nginx EXIT INT TERM",
    'mv -f "$tmp_fullchain" "$SSL_DIR/fullchain.pem"',
    'docker exec "$NGINX_CONTAINER" nginx -t',
  ]) &&
    hasAll(setupServer, [
      'TLS_RENEW_SCRIPT="$RUNTIME_DIR/docker/renew-ssl.sh"',
      "guoxue-tls-renewal.log",
      "certbot renew.*guoxue-nginx",
      "DEPLOY_TARGET=standard PLATFORM_ROOT=$PLATFORM_ROOT",
    ]) &&
    hasAll(standardTlsBootstrap, [
      'CERTBOT_IMAGE="certbot/certbot:v3.2.0@sha256:3ad1eb352f6b2ae3f359dce4b262f699cc178be0ab9d9f375210e8741404720e"',
      "flock -n 9",
      'RENEW_SCRIPT="$PLATFORM_ROOT/current/docker/renew-ssl.sh"',
      "guoxue-tls-renewal.log",
    ]) &&
    !standardTlsBootstrap.includes("certbot renew --quiet --post-hook"),
  "自建入口必须安装互斥的证书续期任务，支持 dry-run，并在续期失败时恢复原 Nginx 与旧证书",
);
add(
  "CLB 部署与故障切换探测跟随目标环境域名",
  hasAll(nginxClbDeploy, [
    "read_env_value NGINX_SERVER_NAMES",
    "CLB_PROBE_HOST:-",
    '-e NGINX_SERVER_NAMES="${nginx_server_names}"',
    '-H "Host: ${probe_host}"',
  ]) &&
    hasAll(clbFailoverProbe, [
      "${BASE_URL:?必须通过 BASE_URL 指定本次切换要探测的公网入口}",
      'base_url="${BASE_URL%/}"',
      "https://[A-Za-z0-9.-]+",
    ]) &&
    !nginxClbDeploy.includes("pre-api.rebugx.cn") &&
    !clbFailoverProbe.includes("pre-api.rebugx.cn"),
  "Nginx Host 校验和 CLB 连续探测必须绑定本次生产配置，禁止静默回退到旧预发布域名",
);
add(
  "腾讯云验收脚本显式绑定本次目标资源",
  hasAll(tencentCloudAudit, [
    '"--region"',
    '"--clb-id"',
    '"--cdn-domain"',
    '"--certificate-domain"',
    '"--validate-input-only"',
    "validate_target_binding(arguments)",
    'payload={"LoadBalancerId": clb_id}',
    'action="DescribeLoadBalancers"',
    'payload={"LoadBalancerIds": [clb_id]}',
    '"loadBalancerVips"',
    'payload={"Offset": 0, "Limit": 100, "SearchKey": certificate_domain}',
    'lambda: summarize_cdn(credentials, target["cdnDomain"])',
    "evaluate_readiness(result)",
    'if not readiness["success"]:',
    "raise SystemExit(1)",
  ]) &&
    hasAll(read("docker/.env.production.example"), [
      "TENCENT_REGION=",
      "TENCENT_CLB_ID=",
      "TENCENT_CDN_DOMAIN=",
      "TENCENT_CERTIFICATE_DOMAIN=",
    ]) &&
    hasAll(read("scripts/migration/check-env.mjs"), [
      'required.push(\n    "TENCENT_REGION"',
      "TENCENT_CDN_DOMAIN 必须与 PUBLIC_ASSET_ORIGIN 主机名一致",
      "TENCENT_CERTIFICATE_DOMAIN 必须与 PUBLIC_DOMAIN 一致",
    ]) &&
    read("package.json").includes('"release:test-tencent-cloud-audit"') &&
    read("package.json").includes("pnpm release:test-tencent-cloud-audit") &&
    !tencentCloudAudit.includes("lb-kifcf99d") &&
    !tencentCloudAudit.includes("pre-static.rebugx.cn"),
  "购买新 CLB、CDN 和证书后必须由显式资源标识驱动审计，禁止误查旧预发布资源",
);

const publicDnsProbe = read("scripts/release/public-dns.mjs");
const publicDnsTest = read("tests/release/public-dns.test.mjs");
const publicRuntimeVerifier = read("scripts/release/verify-runtime.mjs");
const dnsEvidenceAggregator = read("scripts/release/aggregate-launch-evidence.mjs");
const infrastructureIntakeAuditor = read("scripts/release/audit-infrastructure-intake.mjs");
const infrastructureIntakeExample = read("config/release/infrastructure-intake.example.json");
const productionCutoverDnsVerifier = read("scripts/release/verify-production-cutover.sh");
add(
  "公网 DNS 必须绑定本次 CLB 与 CDN 目标",
  hasAll(publicDnsProbe, [
    "defaultPublicDnsResolvers",
    "createPublicDnsResolver",
    "probeAuthoritativeDns",
    'id: "dnspod"',
    'id: "alidns"',
    "resolveCname",
    "resolveSoa",
    "resolveNs",
    "resolve4",
    "resolve6",
    "maximumTtlSeconds",
    "ttlSeconds",
    "isPublicAddress",
    "cnameChain",
  ]) &&
    hasAll(publicRuntimeVerifier, [
      "probePublicDns",
      "公网 DNS 解析与地址安全",
      "dnsEndpoints",
      "dnsObservations",
      "dnsAuthorityObservations",
      "infrastructureIntakeSha256",
      "authoritativeNameServers",
      'dnsObservationMode: "system-plus-public-authority-v2"',
      "权威 DNS 委派与切流 TTL 收敛",
    ]) &&
    hasAll(infrastructureIntakeAuditor, [
      "authoritativeNameServers",
      "权威 DNS 双 NS 委派已规划",
    ]) &&
    infrastructureIntakeExample.includes('"authoritativeNameServers"') &&
    hasAll(productionCutoverDnsVerifier, [
      '--infrastructure-intake "$INFRASTRUCTURE_INTAKE_FILE"',
      'verify-runtime.mjs" "$ENV_FILE"',
    ]) &&
    hasAll(dnsEvidenceAggregator, [
      "loadBalancerVips",
      "cdnCname",
      "公网 DNS 多解析器一致性证据无效",
      "系统 DNS 快照与多解析器证据不一致",
      "公网 DNS TTL 或权威 NS 策略证据无效",
      "运行时 DNS 验收未绑定本次新基础设施接入清单",
      "权威 DNS 委派或多解析器一致性证据无效",
      '"system", "dnspod", "alidns"',
      "recordAddresses.every",
      "公网 DNS 未指向本次腾讯云 CLB/CDN 目标",
    ]) &&
    hasAll(publicDnsTest, [
      "公网地址拒绝私网、回环、保留和文档地址",
      "多路公网解析器使用受控 IP 并拒绝无效服务器",
      "DNS 探测保留 CNAME 链和去重后的公网地址",
      "DNS 探测阻断私网解析、IP 入口和 CNAME 循环",
      "切流 DNS 探测记录真实 TTL 并阻断尚未收敛的旧高 TTL",
      "权威 DNS 探测从子域向上定位区域并严格核对双 NS 委派",
    ]) &&
    read("package.json").includes('"release:test-public-dns"'),
  "域名能访问不足以证明切流成功；上线证据必须核对双 NS 委派与真实 TTL，并把公网解析结果与本次接入清单及 CLB/CDN 目标交叉校验",
);

const productionEnvAuditor = read("scripts/migration/check-env.mjs");
const productionEnvAuditorTests = read("tests/release/check-env.test.mjs");
const paymentControlPlaneGuide = read("docs/operations/支付小程序人工配置清单-20260731.md");
const financeControlPlaneGuide = read("docs/operations/发给财务的支付后台变更提示词-20260731.md");
add(
  "第三方回调和客户端域名白名单必须绑定本次新域名",
  hasAll(infrastructureIntakeAuditor, [
    "externalEndpoints",
    "第三方回调地址规划只指向新 API 入口",
    "第三方控制台、回调安全与客户端白名单已现场验收",
    "callbackUrlsFingerprint",
    "controlPlaneCallbacks",
    "已启用云能力均登记正式控制台回调",
    "tencent-live-audit",
    "clientDomainAllowlistEntries",
    "已启用微信客户端均登记完整合法域名",
    "wechat-mini-socket-api",
    "wechat-official-js-sdk-h5",
    "wechatClientDelivery",
    "微信客户端身份与交付责任已绑定",
    "微信 H5 授权分享与小程序合法域名已真机验收",
    "officialAccountShareCardVerified",
    "corsAllowedOrigins",
    "对象存储 CORS 仅登记精确 HTTPS origin",
    "对象存储 CORS 来源与正式 H5 和后台入口完全绑定",
  ]) &&
    infrastructureIntakeExample.includes('"externalEndpoints"') &&
    hasAll(productionEnvAuditor, [
      "必须与 PUBLIC_API_URL 同源，禁止第三方平台继续回调旧域名",
      "WECHAT_PAY_REFUND_NOTIFY_URL",
      "KUAIDI100_CALLBACK_URL",
    ]) &&
    hasAll(paymentControlPlaneGuide, [
      "PUBLIC_API_URL",
      "PUBLIC_H5_URL",
      "不得从历史预发布或旧生产文档复制域名",
    ]) &&
    !paymentControlPlaneGuide.includes("pre-api.rebugx.cn") &&
    !financeControlPlaneGuide.includes("pre-api.rebugx.cn"),
  "迁移门禁必须阻断旧回调域名，并要求支付/物流控制台、回调验签重放和小程序/App 域名白名单留下受控证据",
);
add(
  "正式上线配置阻断预发布域名混入",
  hasAll(productionEnvAuditor, [
    "isPreproductionHostname",
    "正式上线配置禁止使用 pre-* 预发布域名",
    'label === "pre" || label.startsWith("pre-")',
  ]) &&
    hasAll(productionEnvAuditorTests, [
      "完整上线配置拒绝预发布 API、H5 与静态资源域名",
      "pre-api.rebugx.cn",
      "pre-static.rebugx.cn",
    ]),
  "正式包和正式服务器配置不得复用 pre-* API、H5、静态资源或客户端公开地址",
);
add(
  "公网合规与旧域名处置纳入新基础设施交接",
  infrastructureIntakeExample.includes('"publicCompliance"') &&
    infrastructureIntakeExample.includes('"legacyOriginMode"') &&
    hasAll(infrastructureIntakeAuditor, [
      "公网合规与旧域名处置责任已登记",
      "旧域名处置计划完整且仅含 HTTPS origin",
      "协议隐私、反馈举报与账号注销闭环已现场验收",
      "旧域名永久跳转已现场验收",
      "publicComplianceEvidence",
      "legacyOriginsFingerprint",
    ]) &&
    hasAll(productionEnvAuditor, [
      "MIGRATION_OLD_ORIGINS 只能填写 origin",
      "MIGRATION_OLD_ORIGINS 包含当前生产 origin",
    ]),
  "新域名可访问还不够；必须验收协议隐私、反馈举报、账号注销，并将旧入口永久跳转到新 H5",
);
const bootstrap = read(shellScripts[0]);
add(
  "空库初始化具备硬保护",
  hasAll(bootstrap, [
    'CONFIRM_EMPTY_DATABASE:-}" != "YES"',
    "information_schema.tables",
    "full-baseline.sql",
    "OPERATIONAL_DDL",
    "--single-transaction",
    "prisma migrate status",
    'SELECT COUNT(*)::int AS count FROM "_prisma_migrations"',
  ]),
  "必须显式确认、拒绝业务表非空、应用全量基线并核对迁移账本",
);

const operationalMigration = read(
  "apps/server/prisma/migrations/20260730100000_repair_operational_database_objects/migration.sql",
);
add(
  "Prisma 外部数据库对象可重复创建",
  hasAll(operationalMigration, [
    "CREATE EXTENSION IF NOT EXISTS vector",
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    'ALTER TABLE "CircleKnowledge"',
    'ADD COLUMN IF NOT EXISTS "embedding" vector(1536)',
    '"CircleKnowledge_embedding_hnsw_idx"',
    '"idx_article_fts"',
    '"Course_tags_gin_idx"',
    '"Article_title_trgm_idx"',
  ]),
  "空库与旧库必须由同一条幂等迁移补齐向量、全文、标签和模糊检索对象",
);

const exporter = read(shellScripts[1]);
add(
  "源库导出使用一致性快照、可审计且不修改源库",
  hasAll(exporter, [
    "MIGRATION_EXPORT_MODE",
    "SOURCE_WRITES_FROZEN",
    "MIGRATION_FREEZE_CONFIRM",
    "pg_export_snapshot()",
    '--snapshot="$snapshot_id"',
    "SET TRANSACTION SNAPSHOT :'snapshot_id'",
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "pg_restore --list",
    "table-counts.tsv",
    "manifest.txt",
    "consistent_snapshot",
    "sha256sum \\",
    '"$(basename "$counts_file")"',
    '"$(basename "$manifest_file")"',
  ]) && !/\b(delete|drop|truncate|update|insert)\b/i.test(exporter),
  "归档与逐表计数必须绑定同一快照；最终导出还需停写确认，并共同纳入 SHA-256",
);

const restorer = read(shellScripts[2]);
add(
  "目标库恢复默认拒绝覆盖",
  hasAll(restorer, [
    "RESTORE_CONFIRM",
    "MIGRATION_RESTORE_MODE",
    "manifest_file",
    "export_mode",
    "consistent_snapshot",
    "正式恢复只接受最终停写后生成的 final 归档",
    "迁移恢复只允许写入新建空库",
    "sha256sum --check",
    "--single-transaction",
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
  ]),
  "目标库名称二次确认、演练/最终归档隔离、完整性校验、不可绕过的空库保护和事务式恢复",
);

const verifier = read(shellScripts[3]);
const businessIntegrity = read("scripts/migration/verify-business-integrity.sql");
add(
  "恢复后校验覆盖完整性和关键扩展",
  hasAll(verifier, [
    "SOURCE_CHECKSUM_FILE",
    "sha256sum --check",
    "vector pg_trgm",
    "CircleKnowledge_embedding_hnsw_idx",
    "20260730100000_repair_operational_database_objects",
    "select count(*)",
    "mismatches",
  ]),
  "校验源清单本身不可被静默修改，且逐表核对行数",
);
add(
  "恢复后执行业务完整性与序列门禁",
  verifier.includes("verify-business-integrity.sql") &&
    hasAll(businessIntegrity, [
      "未验证的外键或检查约束",
      "无效或未就绪索引",
      "微信认证缺少 openId",
      "密码认证缺少 credential",
      "库存流水前后余额不守恒",
      "经营中商家缺少上线必需资质",
      "已审核文章缺少首图",
      "pg_get_serial_sequence",
      "current_value < maximum_value",
    ]) &&
    (hasAll(businessIntegrity, ["微信 unionId 跨账号冲突", "同一用户存在重复认证提供方"]) ||
      hasAll(businessIntegrity, [
        "认证作用域身份缺少 namespace 或 subject",
        "认证作用域身份重复或跨账号冲突",
        "微信开放平台锚点跨账号冲突",
        "有限权益余额为负或版本号非法",
        "已退款订单的发放权益缺少 REVOKE 冲正",
      ])),
  "迁移不仅核对表行数，还必须阻止身份归属冲突、认证凭据缺失、失效约束、负库存、账实不符、缺资质商家、缺图文章和序列倒退上线",
);

const vectorService = read("apps/server/src/modules/ai-gateway/vector.service.ts");
add(
  "向量运行时与数据库真实结构一致",
  hasAll(vectorService, [
    "normalizeVectorDimension",
    "table_name = 'CircleKnowledge'",
    'UPDATE "CircleKnowledge" SET "embedding"',
    '"circleId" = $2',
    "this.dimension = 1536",
  ]) &&
    !vectorService.includes("FROM circle_knowledge") &&
    !vectorService.includes("circle_id ="),
  "混元等不同维度输出必须统一到 vector(1536)，并使用 Prisma 实际表名与字段名",
);

const smoke = read(shellScripts[5]);
add(
  "切流冒烟覆盖页面、API、跨域与实时链路",
  hasAll(smoke, [
    "/api/v1/health",
    "access-control-allow-origin",
    "/socket.io/?EIO=4&transport=polling",
    "Engine.IO open packet",
  ]),
  "域名切换后同时验证 H5、API、CORS 和 Socket.IO",
);

const productionBackup = read("docker/pg-backup.sh");
const productionDeploy = read("docker/deploy.sh");
add(
  "生产定时备份跟随实际 DATABASE_URL",
  hasAll(productionBackup, [
    'ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.production}"',
    "sed -n 's/^DATABASE_URL=//p'",
    "--format=custom",
    ".partial",
    "pg_restore --list",
    "manifest_file",
    "sha256sum",
    'DEPLOY_TARGET="${DEPLOY_TARGET:-}"',
    'database_cli_url="$database_url"',
    "schema|connection_limit|pool_timeout",
    "connect_timeout",
    'pg_dump "$database_cli_url"',
    'psql "$database_cli_url"',
    'source_mode="managed-database-url"',
    "printf '%s\\n' \"$database_cli_url\" | docker exec -i",
  ]),
  "托管或独立数据库不能误备份本机空容器，归档必须原子落盘并具备可恢复性与校验和",
);

const productionRestore = read("docker/pg-restore.sh");
const restoreChecksumIndex = productionRestore.indexOf("sha256sum --check");
const restoreArchiveIndex = productionRestore.indexOf("pg_restore --list");
const restoreDropIndex = productionRestore.indexOf(" dropdb ");
add(
  "固定发布包无需依赖 Shell 执行位即可完成备份与恢复前快照",
  productionDeploy.includes('bash "$SCRIPT_DIR/pg-backup.sh"') &&
    productionRestore.includes('bash "$SCRIPT_DIR/pg-backup.sh" 30') &&
    !productionDeploy.includes("./pg-backup.sh") &&
    !/^\s*"\$SCRIPT_DIR\/pg-backup\.sh"\s+30\s*$/mu.test(productionRestore),
  "Windows 源码进入 Linux 固定包时脚本可能保持 0644，关键运维链必须显式通过 bash 调用，避免 Permission denied",
);
add(
  "本机生产恢复在销毁前完成双重校验与快照",
  hasAll(productionRestore, [
    "RESTORE_CONFIRM",
    "ENV_FILE=/dev/null",
    "PRE_RESTORE_BACKUP_DIR",
    "--exit-on-error",
    "pg_terminate_backend",
  ]) &&
    restoreChecksumIndex >= 0 &&
    restoreArchiveIndex > restoreChecksumIndex &&
    restoreDropIndex > restoreArchiveIndex,
  "校验和、归档目录验证、精确库名确认和恢复前快照必须先于 dropdb",
);

const retiredServerSetup = read("scripts/server-setup.sh");
const productionEnvTemplate = read("docker/.env.production.example");
const operationalRunbook = read("docker/RUNBOOK.md");
const rollbackPlan = read("docs/rollback-plan.md");
const legacyDeploymentChecklist = read("docs/deployment-checklist.md");
const disasterRecoveryPlan = read("docs/disaster-recovery-plan.md");
const currentCompose = read("scripts/release/current-compose.sh");
const releaseLayoutValidator = read("scripts/release/validate-release-layout.sh");
const releaseLayoutTest = read("tests/release/validate-release-layout.test.mjs");
const productionDockerfile = read("docker/Dockerfile");
const productionEntrypoint = read("docker/entrypoint.sh");
const rootPackageJson = read("package.json");
add(
  "生产备份目标分支具备可执行回归测试",
  hasAll(rootPackageJson, [
    '"release:test-pg-backup-target"',
    "tests/release/pg-backup-target.test.mjs",
    "pnpm release:test-pg-backup-target",
  ]),
  "代码门禁必须真实执行托管库、自建库和非法部署目标三条备份分支",
);
add(
  "定时任务显式加载生产数据库地址",
  setupServer.includes(
    "DEPLOY_TARGET=$DEPLOY_TARGET ENV_FILE=$ENV_FILE BACKUP_DIR=$BACKUP_DIR bash $BACKUP_SCRIPT 30",
  ),
  "cron 必须读取同一份生产环境文件，避免登录 shell 与定时任务备份目标不一致",
);
add(
  "服务器初始化严格分离自建与托管数据服务",
  hasAll(setupServer, [
    'DEPLOY_TARGET="${DEPLOY_TARGET:-}"',
    'NODE_ROLE="${NODE_ROLE:-operations}"',
    'case "$NODE_ROLE" in',
    "COMPOSE+=( -f docker-compose.tencent.yml )",
    'if [ "$DEPLOY_TARGET" = "standard" ]; then',
    "Environment=DEPLOY_TARGET=$DEPLOY_TARGET",
    '"${COMPOSE[@]}" up -d --build postgres redis',
    "托管架构：不启动本地 PostgreSQL / Redis",
  ]),
  "托管架构不得因显式点名 profile 服务而误启动本地空 PostgreSQL/Redis",
);
add(
  "双应用节点按角色隔离单例运维组件",
  hasAll(setupServer, [
    'if [ "$NODE_ROLE" = "operations" ]; then',
    "Environment=NODE_ROLE=$NODE_ROLE",
    "guoxue-monitoring.service",
    "systemctl disable --now guoxue-monitoring.service",
    "label=com.docker.compose.project=monitoring",
    "docker rm -f",
    "业务节点：已停止重复监控栈，保留数据卷与镜像",
    "节点角色:",
  ]) &&
    hasAll(productionDeploy, ['NODE_ROLE="${NODE_ROLE:-operations}"', '--node-role "$NODE_ROLE"']),
  "业务节点不得复制 Grafana、Prometheus、企业微信告警和数据库定时备份；运维节点集中承载单例任务",
);
add(
  "服务器现场指引不再遗漏部署架构",
  hasAll(setupServer, [
    "DEPLOY_TARGET=standard DATABASE_MODE=prepare",
    "DEPLOY_TARGET=tencent",
    "ENV_FILE=/opt/guoxue/shared/.env.production",
  ]) &&
    hasAll(retiredServerSetup, [
      "DEPLOY_TARGET=standard DATABASE_MODE=prepare",
      "DEPLOY_TARGET=tencent",
      "DEPLOY_TARGET=standard ENV_FILE=/opt/guoxue/shared/.env.production bash ./deploy.sh",
      "初始化、发布、健康检查、备份和回滚不得混用部署架构",
      "exit 78",
    ]),
  "脚本头部和已停用兼容入口给出的替代命令必须可直接执行，并明确 standard/tencent 二选一",
);
add(
  "服务器初始化指引不依赖固定包 Shell 执行位",
  hasAll(setupServer, [
    "ENV_FILE=/opt/guoxue/shared/.env.production bash docker/setup-server.sh",
    "请用 root 权限运行: sudo bash docker/setup-server.sh",
    "可以稍后运行: bash docker/nginx/setup-ssl.sh",
  ]) &&
    !setupServer.includes("chmod +x docker/setup-server.sh") &&
    !setupServer.includes("sudo ./setup-server.sh"),
  "固定包内脚本保持 0644 时，初始化、错误提示与证书补办指引也必须可以直接复制执行",
);
add(
  "生产运行手册不依赖固定包 Shell 执行位",
  hasAll(operationalRunbook, [
    'DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" bash ./health-check.sh',
    'DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" bash ./docker/deploy.sh',
    'DEPLOY_TARGET="$DEPLOY_TARGET" ENV_FILE="$ENV_FILE" bash ./pg-backup.sh',
    "ALLOW_PROD_DB_MIGRATION=reviewed bash ./deploy.sh --migrate",
    "/usr/bin/env bash /opt/guoxue/current/docker/pg-backup.sh 30",
    'DEPLOY_TARGET=tencent ENV_FILE="$ENV_FILE" bash ./docker/pg-backup.sh',
    "bash ./docker/pg-restore.sh docker/backups/guoxue_20260515T030000Z.dump",
    'BACKUP_DIR="$(pwd)/docker/backups" bash ./docker/pg-backup.sh 30',
    "DEPLOY_TARGET=standard bash ./pg-backup.sh",
    "RESTORE_CONFIRM=guoxue bash ./pg-restore.sh backups/xxx.dump",
  ]) &&
    !hasDirectShellScriptCommand(operationalRunbook) &&
    hasAll(legacyDeploymentChecklist, [
      'ENV_FILE="$ENV_FILE" bash ./docker/pg-backup.sh 30',
      "ALLOW_PROD_DB_MIGRATION=reviewed bash ./deploy.sh --migrate",
      'ENV_FILE="$ENV_FILE" bash ./deploy.sh',
    ]) &&
    !hasDirectShellScriptCommand(legacyDeploymentChecklist),
  "备份、恢复和带迁移发布指令必须显式交给 bash，避免压缩包或 Windows 工作树丢失执行位后值班命令失效",
);
add(
  "生产环境模板区分自建与托管数据地址",
  hasAll(productionEnvTemplate, [
    "DEPLOY_TARGET 不从本文件静默推断",
    "standard：可使用容器内主机名 postgres / redis",
    "tencent：DATABASE_URL / DATABASE_REPLICA_URL / REDIS_URL 必须改成已验收的托管服务私网地址",
    "不得保留 postgres / redis 容器名或本地回环地址",
  ]),
  "正式模板必须阻止把本地容器地址误用于腾讯云托管数据库和 Redis",
);
add(
  "运维参考拒绝历史 Git 与数据库覆盖式回滚",
  hasAll(operationalRunbook, [
    "当前生产上线唯一现场入口（2026-07-31 起）",
    "export DEPLOY_TARGET='standard'",
    "export ENV_FILE='/opt/guoxue/shared/.env.production'",
    "rollback-fixed-release.sh",
    "不执行逆向 SQL、不修改",
    "恢复必须创建新的隔离空库",
  ]) &&
    !operationalRunbook.includes("git checkout <last-good-commit>") &&
    !operationalRunbook.includes("deploy.sh --rollback              #"),
  "组件 Runbook 必须明确让位于权威现场清单，并拒绝从 Git 重建旧版、逆向 SQL 或旧库覆盖式回滚",
);
add(
  "历史部署与灾备文档不会绕过当前现场清单",
  hasAll(rollbackPlan, [
    "DEPLOY_TARGET='tencent'",
    'DEPLOY_TARGET="$DEPLOY_TARGET"',
    "rollback-fixed-release.sh",
  ]) &&
    hasAll(legacyDeploymentChecklist, [
      "历史检查表，仅作项目项点参考",
      "九证据聚合和最终双签",
      "export DEPLOY_TARGET='standard'",
      "export ENV_FILE='/opt/guoxue/shared/.env.production'",
    ]) &&
    hasAll(disasterRecoveryPlan, [
      "pg_dump` 不能提供增量恢复",
      "临时小时级完整归档 (pg_dump custom)",
      "DEPLOY_TARGET=tencent ENV_FILE=/opt/guoxue/shared/.env.production",
      "/opt/guoxue/current/docker/pg-backup.sh",
    ]) &&
    !disasterRecoveryPlan.includes("增量备份 (pg_dump 差异)"),
  "旧检查表和灾备策略必须显式指向当前权威清单，所有可复制命令仍要绑定部署架构与共享环境文件",
);

const hostPreflight = read("scripts/release/preflight-host.sh");
const hostPreflightAudit = read("scripts/release/audit-host-preflight.mjs");
const hostPreflightTest = read("tests/release/audit-host-preflight.test.mjs");
add(
  "新服务器预检覆盖容量、网络、运行时和权限硬门禁",
  hasAll(hostPreflight, [
    "_NPROCESSORS_ONLN",
    "MemAvailable:",
    "df -Pk",
    "df -Pi",
    "NTPSynchronized",
    'getent ahosts "$DOMAIN"',
    "ss -ltnH",
    "stat -c '%a' \"$ENV_FILE\"",
    "ENV_PERMISSIONS & 077",
    "docker info",
    "docker compose version",
    "SUPPORTED_NODE_MAJORS",
    "MIN_POSTGRES_CLIENT_VERSION",
    "pg_restore",
    "flock",
    '"$PROJECT_DIR/.release-id"',
    '"$PROJECT_DIR/RELEASE-MANIFEST.json"',
  ]),
  "主机必须在变更前验证 CPU、内存、磁盘、inode、时钟、DNS、端口、Docker、环境权限和固定包身份",
);
add(
  "服务器初始化补齐固定包与数据库核验所需宿主机运行时",
  hasAll(setupServer, [
    "node_24.x",
    "postgresql-client-${POSTGRES_CLIENT_MAJOR}",
    "^(22|24)\\.",
    "宿主机运行时: Node.js",
  ]),
  "初始化必须安装受支持的 Node.js LTS 和与目标主版本一致的 PostgreSQL 客户端，避免迁移中途才暴露缺失命令",
);
add(
  "服务器初始化在任何主机变更前锁定已验收操作系统矩阵",
  hasAll(setupServer, [
    "生产验收支持: Ubuntu 22.04 / 24.04 / 26.04 LTS",
    'case "$OS:$OS_VERSION" in',
    "ubuntu:22.04|ubuntu:24.04|ubuntu:26.04",
    "生产初始化仅支持已验收的 Ubuntu 22.04 / 24.04 / 26.04 LTS",
    "exit 65",
  ]) &&
    setupServer.indexOf('case "$OS:$OS_VERSION" in') <
      setupServer.indexOf("执行安装前只读主机预检") &&
    read("docs/operations/服务器数据库域名迁移手册-20260728.md").includes(
      "生产初始化仅验收 Ubuntu 22.04/24.04/26.04 LTS",
    ),
  "不得继续声称或静默尝试未经运行手册验收的发行版；购买或重装新机时必须选择 Ubuntu 22.04/24.04/26.04 LTS",
);
const immutableNodeRuntimeImage =
  "node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d";
const immutableNodeDevImage =
  "node:24.18.0-alpine3.23@sha256:595398b0081eacda8e1c4c5b97b76cd1020e4d58a8ebcb4843b9bca1e79e7436";
const developmentDockerfile = read("docker/Dockerfile.dev");
const testDockerfile = read("docker/Dockerfile.test");
const nodeRuntimeCiWorkflow = read(".github/workflows/ci.yml");
const nodeRuntimeDeployWorkflow = read(".github/workflows/deploy.yml");
const nodeRuntimePerformanceWorkflow = read(".github/workflows/perf.yml");
const nodeRuntimePredeployWorkflow = read(".github/workflows/predeploy-readiness.yml");
const nodeRuntimeProductionVerificationWorkflow = read(".github/workflows/verify-production.yml");
const nodeRuntimeCnbPipeline = read(".cnb.yml");
add(
  "Node.js 构建、验证与生产运行时统一使用受支持且不可变的 LTS 基线",
  rootPackageJson.includes('"node": ">=22 <23 || >=24 <25"') &&
    countOccurrences(productionDockerfile, immutableNodeRuntimeImage) === 2 &&
    countOccurrences(setupServer, immutableNodeRuntimeImage) === 2 &&
    countOccurrences(productionDeploy, immutableNodeRuntimeImage) === 1 &&
    countOccurrences(developmentDockerfile, immutableNodeDevImage) === 2 &&
    countOccurrences(testDockerfile, immutableNodeDevImage) === 1 &&
    [nodeRuntimeCiWorkflow, nodeRuntimeDeployWorkflow, nodeRuntimePerformanceWorkflow].every(
      (source) => source.includes('NODE_VERSION: "24.18.0"'),
    ) &&
    [nodeRuntimePredeployWorkflow, nodeRuntimeProductionVerificationWorkflow].every((source) =>
      source.includes('node-version: "24.18.0"'),
    ) &&
    countOccurrences(nodeRuntimeCnbPipeline, immutableNodeRuntimeImage) === 4 &&
    ![productionDockerfile, developmentDockerfile, testDockerfile, setupServer, productionDeploy]
      .join("\n")
      .includes("node:20"),
  "Node.js 20 已退出维护；CI、CNB、开发/测试镜像、生产镜像和迁移期临时容器必须锁定同一受支持版本及 OCI 摘要",
);
add(
  "生产镜像只调用锁定安装的 Prisma CLI",
  hasAll(productionDockerfile, [
    "corepack prepare pnpm@10.33.3 --activate",
    "pnpm --dir apps/server exec prisma generate",
  ]) &&
    hasAll(productionEntrypoint, ["pnpm --dir /app/apps/server exec prisma migrate deploy"]) &&
    hasAll(setupServer, ["pnpm --dir /app/apps/server exec prisma migrate status"]) &&
    ![productionDockerfile, productionEntrypoint, setupServer].some((source) =>
      source.includes("npx prisma"),
    ),
  "镜像构建、启动和首次验收不得由 npx 临时解析或下载 Prisma，必须使用镜像内锁定依赖",
);
add(
  "构建机与生产镜像固定同一 pnpm 补丁版本",
  rootPackageJson.includes('"packageManager": "pnpm@10.33.3"') &&
    ["ci.yml", "deploy.yml", "perf.yml"].every(
      (file) =>
        read(`.github/workflows/${file}`).includes('PNPM_VERSION: "10.33.3"') ||
        read(`.github/workflows/${file}`).includes("PNPM_VERSION: '10.33.3'"),
    ),
  "依赖安装工具本身也必须可复现，禁止 CI 与镜像各自漂移到不同的 pnpm 10.x",
);
add(
  "新服务器预检保持只读",
  !/(apt-get|dnf install|yum install|sysctl -p|swapon|ufw |firewall-cmd|systemctl )/.test(
    hostPreflight,
  ),
  "预检脚本不得安装软件、修改内核、防火墙、服务或磁盘状态",
);
add(
  "主机预检生成脱敏且绑定固定版本的第九份机器证据",
  hasAll(hostPreflightAudit, [
    'kind: "guoxue-host-preflight-readiness"',
    'path.join(projectDir, ".release-id")',
    "observedReleaseId !== releaseId",
    'readFile("/etc/machine-id"',
    "hostIdentitySha256",
    "preflightScriptSha256",
    "sourceOutputSha256",
    "mode: 0o600",
  ]) &&
    !hostPreflightAudit.includes("detail: match[2]") &&
    hasAll(hostPreflightTest, [
      "主机预检通过时生成脱敏且绑定版本的机器证据",
      "主机预检失败时仍落盘阻断证据并返回失败",
      "发布目录身份与预期不一致时拒绝执行预检",
    ]) &&
    read("package.json").includes("release:test-host-preflight"),
  "最终 GO 必须证明实际新服务器通过预检；报告只能保存状态、哈希和计数，不能保存主机、域名、路径或原始输出",
);
add(
  "服务器初始化在系统变更前后执行双阶段预检",
  hasAll(setupServer, [
    "执行安装前只读主机预检",
    "REQUIRE_DOCKER=false",
    "REQUIRE_BASE_TOOLS=false",
    "执行 Docker 安装后完整主机预检",
    "REQUIRE_DOCKER=true",
    "REQUIRE_BASE_TOOLS=true",
    "REQUIRE_RELEASE_MANIFEST=true",
    "--report /evidence/environment-readiness.json",
    'chmod 600 "$INSTALL_DIR/release-evidence/environment-readiness.json"',
  ]) &&
    setupServer.indexOf("执行安装前只读主机预检") < setupServer.indexOf("timedatectl set-timezone"),
  "任何 swap、sysctl、防火墙或容器变更前先做只读检查，Docker 安装后再完整复核并保留无密钥验收报告",
);
add(
  "服务器初始化校验第三方软件源密钥完整指纹",
  hasAll(setupServer, [
    "verify_openpgp_key",
    "6F71F525282841EEDAF851B42F59B5F99B1BE0B4",
    "B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8",
    "9DC858229FC7DD38854AE2D88D81803C0EBFCD88",
    'gpg --batch --show-keys --with-colons "$key_file"',
  ]) &&
    countOccurrences(setupServer, "verify_openpgp_key \\") === 3 &&
    !/download\.docker\.com\/linux\/\$OS\/gpg[^\n]*\|/.test(setupServer),
  "NodeSource、PostgreSQL 与 Docker DEB 密钥必须先落盘并核对主指纹，禁止远程密钥直接进入导入管道",
);
add(
  "服务器首次初始化注入并核对固定发布标识",
  hasAll(setupServer, [
    "scripts/release/validate-release-layout.sh",
    'RELEASE_ID="$(bash',
    "export RELEASE_ID",
    "SETUP_RUNTIME_RELEASE_ID",
    '[ "$SETUP_RUNTIME_RELEASE_ID" = "$RELEASE_ID" ]',
    "服务已就绪且运行版本一致",
  ]) && setupServer.indexOf("export RELEASE_ID") < setupServer.indexOf('"${COMPOSE[@]}" config -q'),
  "新机首次启动也必须把固定包版本注入容器，并同时通过依赖就绪与运行实例版本核对",
);
add(
  "首次初始化只允许从受管版本目录启动",
  hasAll(releaseLayoutValidator, [
    'RELEASES_DIR="$PLATFORM_ROOT/releases"',
    'EXPECTED_REAL="$RELEASES_REAL/$RELEASE_ID"',
    'if [ "$PROJECT_REAL" != "$EXPECTED_REAL" ]',
    "首次初始化目录不受版本管理",
  ]) &&
    hasAll(setupServer, [
      "scripts/release/validate-release-layout.sh",
      'RELEASE_ID="$(bash',
      "固定发布目录与发布标识已核对",
    ]) &&
    setupServer.indexOf("scripts/release/validate-release-layout.sh") <
      setupServer.indexOf("timedatectl set-timezone") &&
    hasAll(releaseLayoutTest, [
      "releases/<release-id> 完全一致时通过",
      "incoming 或其他目录时阻断首次初始化",
      "非法发布标识在任何系统改动前被拒绝",
    ]) &&
    rootPackageJson.includes("release:test-layout") &&
    rootPackageJson.includes("pnpm release:test-layout"),
  "首次启动和 systemd 重启必须指向同一 releases/<release-id>；临时 incoming、项目根或手工目录不得成为 current",
);
add(
  "系统重启从权威 current 动态恢复发布身份",
  hasAll(currentCompose, [
    'CURRENT_DIR=$(readlink -f "$RUNTIME_DIR"',
    '"$PLATFORM_ROOT"/releases/*',
    "RELEASE_ID=$(tr -d",
    "export COMPOSE_PROJECT_NAME RELEASE_ID",
    'exec "${COMPOSE[@]}" "$@"',
  ]) &&
    hasAll(setupServer, [
      'Environment="PLATFORM_ROOT=$PLATFORM_ROOT"',
      'Environment="RUNTIME_DIR=$RUNTIME_DIR"',
      'Environment="ENV_FILE=$ENV_FILE"',
      "ExecStart=/bin/bash $RUNTIME_DIR/scripts/release/current-compose.sh up -d",
      "ExecStop=/bin/bash $RUNTIME_DIR/scripts/release/current-compose.sh down",
      "ExecReload=/bin/bash $RUNTIME_DIR/scripts/release/current-compose.sh restart server",
    ]),
  "systemd 不得依赖初始化进程的临时环境；每次开机、停止和重载都必须从 current/.release-id 重新绑定运行版本",
);
add(
  "主机清理与数据库备份不得破坏回滚或并发写入",
  hasAll(setupServer, [
    'CLEANUP_SCRIPT="$RUNTIME_DIR/scripts/operations/cleanup-docker-retention.sh"',
    "ROLLBACK_IMAGE_KEEP=2 BUILDER_CACHE_MAX_AGE=168h",
  ]) &&
    hasAll(dockerCleanup, [
      'exec 8>"$ROOT_DIR/.release-activation.lock"',
      "flock -n 8",
      'docker builder prune -af --filter "until=$BUILDER_CACHE_MAX_AGE"',
      "docker image prune -f",
      "保留最近 $ROLLBACK_IMAGE_KEEP 个回滚镜像",
    ]) &&
    !dockerCleanup.includes("docker system prune") &&
    !dockerCleanup.includes("docker volume prune") &&
    hasAll(productionBackup, [
      'BACKUP_LOCK_FILE="${BACKUP_LOCK_FILE:-$BACKUP_DIR/.backup.lock}"',
      "flock -n 9",
      "已有数据库备份任务正在执行",
    ]),
  "磁盘清理必须保留有标签的旧版镜像，备份任务必须以文件锁拒绝并发归档",
);

const deployScript = read("docker/deploy.sh");
add(
  "生产部署迁移只使用镜像内锁定 Prisma CLI",
  hasAll(deployScript, [
    "pnpm --dir /app/apps/server exec prisma migrate status",
    "pnpm --dir /app/apps/server exec prisma migrate deploy",
    "MIGRATION_DEPLOY_CONFIRM=migrate:",
  ]) && !deployScript.includes("npx prisma"),
  "迁移状态快照与正式 deploy 都不得触发 npx 的隐式联网解析",
);
add(
  "生产部署复用主机预检与无密钥环境报告",
  hasAll(deployScript, [
    "environment-readiness.json",
    "--report /evidence/environment-readiness.json",
    "scripts/release/preflight-host.sh",
    "REQUIRE_RELEASE_MANIFEST=true",
    "ALLOW_OCCUPIED_PORTS=true",
    'COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-guoxue}"',
    'info "  当前版本: $RELEASE_ID"',
  ]) && !deployScript.includes("当前版本: $(git rev-parse --short HEAD)"),
  "重复部署允许复核已占用入口端口，但仍必须校验固定包身份、生产环境报告和无 .git 发布版本展示",
);
add(
  "生产部署阻断旧实例冒充新版本通过",
  hasAll(deployScript, [
    "RUNTIME_RELEASE_ID",
    '[ "$RUNTIME_RELEASE_ID" = "$RELEASE_ID" ]',
    "CONTAINER_HEALTH_STATUS",
    ".State.Health.Status",
    '[ "$CONTAINER_HEALTH_STATUS" = "healthy" ]',
    "NGINX_HEALTH_STATUS",
    '[ "$NGINX_HEALTH_STATUS" = "healthy" ]',
    "服务已响应，但运行版本不一致",
    "服务存活、容器健康且运行版本一致",
    "自动回滚",
  ]),
  "存活检查必须同时返回本次固定包的发布标识，并等待 Docker 原生健康状态；旧容器或仍在 starting 的新容器不能让部署任务误报成功",
);
add(
  "生产部署完整验证失败后恢复旧镜像与旧版本身份",
  hasAll(deployScript, [
    "rollback_server_image()",
    "PREVIOUS_RELEASE_ID",
    'RELEASE_ID="$rollback_release_id"',
    "已回滚并确认旧运行版本",
    'if ! DEPLOY_TARGET="$DEPLOY_TARGET"',
    'rollback_server_image "❌ 部署后完整健康验证失败"',
    "✅ 部署完成!",
  ]) &&
    deployScript.indexOf('bash "$SCRIPT_DIR/health-check.sh"; then') <
      deployScript.lastIndexOf("✅ 部署完成!"),
  "部署成功只能在完整健康验证之后声明；任何后置验证失败都要恢复旧镜像、旧 RELEASE_ID 并复核回滚实例",
);

const releaseActivator = read("scripts/release/activate-fixed-release.sh");
const releaseActivationBehaviorTest = read("tests/release/verify-fixed-package.test.mjs");
const ciWorkflow = read(".github/workflows/ci.yml");
const deploymentWorkflow = read(".github/workflows/deploy.yml");
const productionVerificationWorkflow = read(".github/workflows/verify-production.yml");
const productionCutoverVerifier = read("scripts/release/verify-production-cutover.sh");
const productionDispatchGate = read("scripts/release/validate-production-dispatch.mjs");
const productionDispatchGateTest = read("tests/release/validate-production-dispatch.test.mjs");
const productionDeployJob =
  deploymentWorkflow.split("  deploy-production:")[1]?.split("  build-staging-image:")[0] ?? "";
const productionClientEvidenceUpload =
  deploymentWorkflow
    .split("name: production-client-evidence-${{ inputs.release_id }}")[1]
    ?.split("if-no-files-found: error")[0] ?? "";
const ciReleaseSafetyJob =
  ciWorkflow.split("  release-safety:")[1]?.split("  # ─── 单元测试 ───")[0] ?? "";
add(
  "PR 与主分支在 Linux 提前执行统一迁移上线门禁",
  hasAll(ciReleaseSafetyJob, [
    "name: 迁移与上线代码门禁",
    "runs-on: ubuntu-24.04",
    "pnpm install --frozen-lockfile",
    "run: pnpm release:gate:code",
  ]) &&
    !ciReleaseSafetyJob.includes("continue-on-error") &&
    ciWorkflow.includes("needs: [test, lint, release-safety]") &&
    ciWorkflow.includes("needs: [typecheck, lint, test, release-safety]"),
  "Linux 专属的切流和回滚成功路径必须在合并前执行，不能等到正式生产发布才暴露失败",
);
add(
  "生产控制链路拒绝猜测部署架构",
  [
    "docker/deploy.sh",
    "docker/health-check.sh",
    "docker/pg-backup.sh",
    "docker/setup-server.sh",
    "scripts/release/activate-fixed-release.sh",
    "scripts/release/rollback-fixed-release.sh",
    "scripts/release/current-compose.sh",
  ].every((relativePath) => read(relativePath).includes('DEPLOY_TARGET="${DEPLOY_TARGET:-}"')) &&
    !deploymentWorkflow.includes("PRODUCTION_DEPLOY_TARGET || 'standard'") &&
    hasAll(deploymentWorkflow, [
      "PRODUCTION_DEPLOY_TARGET: ${{ vars.PRODUCTION_DEPLOY_TARGET }}",
      "DEPLOY_TARGET='${{ vars.PRODUCTION_DEPLOY_TARGET }}'",
    ]) &&
    productionVerificationWorkflow.includes(
      "PRODUCTION_DEPLOY_TARGET: ${{ vars.PRODUCTION_DEPLOY_TARGET }}",
    ),
  "初始化、发布、回滚、重启、健康检查与备份必须显式选择同一架构，缺失时安全失败",
);
add(
  "固定发布包在服务器二次验真后原子激活",
  hasAll(releaseActivator, [
    "sha256sum --check --strict",
    "tar 包含不安全路径",
    "tar 包含链接或特殊文件",
    "verify-fixed-package.mjs",
    "已有发布任务正在执行",
    "shared/.env.production",
    "shared/nginx-ssl",
    "COMPOSE_PROJECT_NAME",
    "MIGRATION_DEPLOY_CONFIRM=migrate:",
    "EXPECTED_COMMIT 必须是完整的 40 位提交 SHA，正式激活不得省略源提交身份",
    '--expected-commit "$EXPECTED_COMMIT"',
    "正式落盘前复核候选目录完整性",
    "复核正式发布目录完整性并生成证据",
    "verify-release-directory.mjs",
    "release-directory-verification.json",
    'CURRENT_ID_NEXT="$ROOT_DIR/current-release-id.next"',
    'ln -s "current/.release-id" "$CURRENT_ID_NEXT"',
    'mv -Tf "$CURRENT_ID_NEXT" "$ROOT_DIR/current-release-id"',
    'CURRENT_NEXT="$ROOT_DIR/current.next"',
    'ln -s "$FINAL_DIR" "$CURRENT_NEXT"',
    'mv -Tf "$CURRENT_NEXT" "$ROOT_DIR/current"',
    "检测到同一固定包留下的发布目录，逐文件复核后执行可重入恢复",
    "同一发布标识已存在不同清单的正式目录，拒绝复用",
    'cmp -s "$TEMP_DIR/RELEASE-MANIFEST.json" "$FINAL_DIR/RELEASE-MANIFEST.json"',
  ]) &&
    releaseActivator.indexOf("正式落盘前复核候选目录完整性") <
      releaseActivator.indexOf('mv "$TEMP_DIR" "$FINAL_DIR"') &&
    releaseActivator.lastIndexOf("verify-release-directory.mjs") >
      releaseActivator.indexOf('mv "$TEMP_DIR" "$FINAL_DIR"') &&
    releaseActivator.indexOf('mv -Tf "$CURRENT_ID_NEXT" "$ROOT_DIR/current-release-id"') <
      releaseActivator.indexOf('mv -Tf "$CURRENT_NEXT" "$ROOT_DIR/current"') &&
    releaseActivator.indexOf('bash "$FINAL_DIR/docker/deploy.sh"') <
      releaseActivator.indexOf('mv -Tf "$CURRENT_NEXT" "$ROOT_DIR/current"'),
  "服务器必须串行执行包级哈希、路径、类型和逐文件复核；同一固定包失败后可复核正式目录并安全重试，部署成功后才切换权威 current，兼容版本指针稳定跟随 current/.release-id",
);
add(
  "成功激活后清理传输副本且失败包可继续安全重试",
  hasAll(releaseActivator, [
    'INCOMING_DIR="$ROOT_DIR/incoming"',
    "cleanup_successful_incoming_transfer",
    'archive_parent="$(realpath -e "$(dirname "$ARCHIVE")")"',
    'checksum_parent="$(realpath -e "$(dirname "$CHECKSUM")")"',
    'rm -f -- "$ARCHIVE" "$CHECKSUM"',
    "正式回滚包保留在 $PACKAGES_DIR",
  ]) &&
    releaseActivator.indexOf("cleanup_successful_incoming_transfer") >
      releaseActivator.indexOf('chmod 0640 "$ROOT_DIR/release-history.tsv"') &&
    hasAll(releaseActivationBehaviorTest, [
      "同一固定包首次部署失败后可复核正式目录并安全重试",
      "await access(incomingArchive)",
      "await assert.rejects(access(incomingArchive))",
      'path.join(hostRoot, "release-packages"',
    ]),
  "失败发布必须保留 incoming 原包供可重入恢复；成功发布只清理已校验处于 incoming 根目录的重复传输副本，release-packages 回滚包不得被删除",
);
const releaseRollback = read("scripts/release/rollback-fixed-release.sh");
const releaseRollbackTest = read("tests/release/rollback-fixed-release.test.mjs");
const releaseDirectoryVerifier = read("scripts/release/verify-release-directory.mjs");
const releaseRetentionAudit = read("scripts/release/audit-release-retention.mjs");
const releaseRetentionTest = read("tests/release/audit-release-retention.test.mjs");
const databaseVerifier = read("scripts/migration/verify-postgres.sh");
const prismaMigrationRunner = read("scripts/migration/run-prisma-migrations.sh");
const databaseEvidenceWriter = read("scripts/migration/write-postgres-verification-report.mjs");
const databaseEvidenceTest = read("tests/release/verify-postgres-evidence.test.mjs");
const launchEvidenceAggregator = read("scripts/release/aggregate-launch-evidence.mjs");
const launchEvidenceTest = read("tests/release/aggregate-launch-evidence.test.mjs");
const launchAcceptanceFinalizer = read("scripts/release/finalize-launch-acceptance.mjs");
const launchAcceptanceTest = read("tests/release/finalize-launch-acceptance.test.mjs");
const launchReadinessAudit = read("scripts/release/audit-launch-readiness.mjs");
const launchReadinessTest = read("tests/release/audit-launch-readiness.test.mjs");
const releasePackageJson = read("package.json");
add(
  "固定包激活与回滚保持节点角色一致",
  hasAll(releaseActivator, [
    'NODE_ROLE="${NODE_ROLE:-operations}"',
    'if [ "$NODE_ROLE" = "operations" ]; then',
    "label=com.docker.compose.project=$MONITORING_COMPOSE_PROJECT_NAME",
    "业务节点：已停止重复监控栈，保留数据卷与镜像",
    "业务节点：跳过监控栈启动",
    'NODE_ROLE="$NODE_ROLE"',
  ]) &&
    hasAll(releaseRollback, [
      'NODE_ROLE="${NODE_ROLE:-operations}"',
      'if [ "$NODE_ROLE" = "operations" ]; then',
      "label=com.docker.compose.project=$MONITORING_COMPOSE_PROJECT_NAME",
      "业务节点：已停止重复监控栈，保留数据卷与镜像",
      "业务节点：跳过监控栈回滚启动",
      'NODE_ROLE="$NODE_ROLE"',
    ]),
  "A/B 节点激活和回滚必须把同一角色传入环境检查与部署，并主动清理业务节点重复监控容器但保留数据卷与镜像",
);
add(
  "双节点滚动发布固定共同基线并在失败时逆序恢复",
  hasAll(deploymentWorkflow, [
    "expected_current_release_id:",
    "EXPECTED_CURRENT_RELEASE_ID: ${{ inputs.expected_current_release_id }}",
    "发布前核验运维节点 B 当前版本基线",
    "id: activate_node_a",
    "id: activate_node_b",
    "发布失败时恢复运维节点 B 的旧应用与监控",
    "发布失败时恢复业务节点 A",
    "failure() && steps.activate_node_a.outcome == 'success'",
    "steps.activate_node_a.outcome == 'failure'",
    "schema-compatible:${{ inputs.release_id }}",
    "ROLLBACK_VERIFY_ONLY=true",
    "恢复后确认 CLB 已重新承接旧版本",
    "rollback-fixed-release.sh",
  ]) &&
    deploymentWorkflow.indexOf("发布前核验运维节点 B 当前版本基线") <
      deploymentWorkflow.indexOf("业务节点 A 二次验真并激活") &&
    deploymentWorkflow.indexOf("发布失败时恢复运维节点 B 的旧应用与监控") <
      deploymentWorkflow.indexOf("发布失败时恢复业务节点 A") &&
    hasAll(productionDispatchGate, [
      'operation === "deploy"',
      "EXPECTED_CURRENT_RELEASE_ID",
      "schema-compatible:",
    ]) &&
    hasAll(productionDispatchGateTest, [
      "双节点迁移发布缺少旧应用向后兼容评审时被阻断",
      "双节点滚动发布缺少当前版本基线时被阻断",
      "切流复核不要求提供滚动发布前版本",
    ]),
  "A/B 必须从同一已验真固定版本开始；任一后续步骤失败时先恢复 B 再恢复 A，迁移发布必须先证明旧应用兼容新结构",
);
const monitoringConfigRenderer = read("scripts/release/render-monitoring-config.mjs");
add(
  "运维节点监控切换与应用激活保持失败可恢复",
  hasAll(releaseActivator, [
    "restore_current_monitoring()",
    "wait_for_monitoring()",
    "monitoring-config-fingerprint.mjs",
    "MONITORING_READY_ATTEMPTS",
    "监控端点状态：Prometheus=",
    "监控配置指纹未变化且端点已就绪，跳过监控容器重建",
    "http://127.0.0.1:9090/-/ready",
    "http://127.0.0.1:9093/-/ready",
    "http://127.0.0.1:3001/api/health",
    'MONITORING_COMPOSE_PROJECT_NAME="${MONITORING_COMPOSE_PROJECT_NAME:-monitoring}"',
    'COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME"',
    "业务栈与监控栈必须使用不同的 Compose 项目名",
    "新监控栈启动失败，且无法恢复当前版本监控配置",
    "部署失败，且无法恢复当前版本监控配置",
  ]) &&
    hasAll(releaseRollback, [
      "restore_current_monitoring()",
      "wait_for_monitoring()",
      "monitoring-config-fingerprint.mjs",
      "MONITORING_READY_ATTEMPTS",
      "监控端点状态：Prometheus=",
      "监控配置指纹未变化且端点已就绪，跳过监控容器重建",
      "http://127.0.0.1:9090/-/ready",
      "http://127.0.0.1:9093/-/ready",
      "http://127.0.0.1:3001/api/health",
      'MONITORING_COMPOSE_PROJECT_NAME="${MONITORING_COMPOSE_PROJECT_NAME:-monitoring}"',
      'COMPOSE_PROJECT_NAME="$MONITORING_COMPOSE_PROJECT_NAME"',
      "业务栈与监控栈必须使用不同的 Compose 项目名",
      "目标版本监控栈启动失败，且无法恢复当前版本监控配置",
      "应用回滚失败，且无法恢复当前版本监控配置",
    ]) &&
    hasAll(monitoringConfigRenderer, [
      "chown(outputFile, 0, 65534)",
      "mode: 0o640",
      "chmod(outputFile, 0o640)",
    ]),
  "业务栈与监控栈必须使用独立 Compose 项目名；配置只读授权给容器运行组，且监控全部就绪后才允许继续应用激活或回滚",
);
add(
  "上线缺口审计覆盖未忽略的未跟踪生产源码并纳入总门禁",
  hasAll(launchReadinessAudit, [
    "ls-files', '--cached'",
    "ls-files', '--others', '--exclude-standard'",
    "coverage",
    "untracked",
  ]) &&
    hasAll(launchReadinessTest, [
      "上线缺口审计会扫描未忽略的未跟踪源码",
      "上线缺口审计不会扫描被 gitignore 排除的生成文件",
      "P0_PLACEHOLDER_TOKEN",
    ]) &&
    releasePackageJson.includes('"release:test-launch-audit"') &&
    releasePackageJson.includes("pnpm release:test-launch-audit"),
  "工作树未冻结前，新源码也必须接受 P0/P1 扫描；忽略目录和生成物不得制造误报",
);
add(
  "数据库迁移核验生成发布版本绑定的机器证据",
  hasAll(databaseVerifier, [
    "MIGRATION_VERIFICATION_MODE",
    "TARGET_RELEASE_ID",
    "MIGRATION_VERIFICATION_REPORT",
    "SOURCE_MANIFEST_FILE",
    "必须来自同一目录",
    "必须且只能绑定当前归档",
    "write-postgres-verification-report.mjs",
    "verify-business-integrity.sql",
    'bash "$script_dir/run-prisma-migrations.sh" status',
  ]) &&
    hasAll(prismaMigrationRunner, [
      "MIGRATION_DEPLOY_CONFIRM",
      "migrate:${TARGET_RELEASE_ID}",
      "docker compose",
      "build server",
      "run --rm --no-deps",
      "-e DATABASE_URL",
      "pnpm --dir /app/apps/server exec prisma migrate",
    ]) &&
    hasAll(databaseEvidenceWriter, [
      'verificationMode === "final"',
      'manifest.export_mode !== "final"',
      "consistentSnapshot",
      "mismatchedTableCount: 0",
      "businessIntegrityPassed: true",
      "prismaMigrationStatusPassed: true",
      'createHash("sha256")',
      "mode: 0o600",
    ]) &&
    hasAll(databaseEvidenceTest, [
      "正式数据库核验生成与发布版本绑定的结构化证据",
      "正式数据库核验拒绝演练归档",
      "缺少发布标识时数据库核验在连接目标库前阻断",
      "数据库核验拒绝混用其他归档目录的表计数",
      "Prisma 迁移状态异常时阻断数据库证据生成",
      "Prisma deploy 必须二次确认并通过生产镜像执行",
    ]) &&
    releasePackageJson.includes("pnpm release:test-migration-verification"),
  "正式数据库核验必须绑定 final 快照、固定发布标识、表计数与业务完整性结果，并生成不含连接串的 SHA-256 证据",
);
add(
  "版本级回滚复核目录完整性并阻断不兼容数据库降级",
  hasAll(releaseActivator, [
    "release-packages",
    "release-history.tsv",
    "RUN_MIGRATION",
    "current-release-id",
    "STORED_HASH",
    "同一发布标识已存在不同内容的保留发布包",
  ]) &&
    hasAll(releaseRollback, [
      "回滚确认值必须与目标发布标识完全一致",
      "ALLOW_SCHEMA_COMPATIBLE_ROLLBACK",
      "LAST_MIGRATION_LINE",
      "缺少发布历史，无法证明目标版本曾成功上线",
      "发布历史中没有目标版本的成功记录",
      "verify-fixed-package.mjs",
      "ARCHIVE_MANIFEST_HASH",
      "current 软链接与当前发布目录标识不一致",
      'CURRENT_ID_NEXT="$ROOT_DIR/current-release-id.next"',
      'ln -s "current/.release-id" "$CURRENT_ID_NEXT"',
      'mv -Tf "$CURRENT_ID_NEXT" "$ROOT_DIR/current-release-id"',
      "回滚入口不是当前可信版本内的脚本",
      "ROLLBACK_VERIFY_ONLY",
      "verify-release-directory.mjs",
      "--skip-migrate",
      'mv -Tf "$ROOT_DIR/current.next" "$ROOT_DIR/current"',
      "release-history.tsv",
    ]) &&
    hasAll(releaseDirectoryVerifier, [
      "生产回滚拒绝脏工作树发布版本",
      "发布文件 SHA-256 不一致",
      "共享证书符号链接目标不正确",
      "发布目录包含未授权额外文件",
    ]) &&
    hasAll(releaseRollbackTest, [
      "非法回滚发布标识在读取服务器状态前被阻断",
      "回滚确认值与目标版本不一致时被阻断",
      "目标版本早于最近数据库迁移时默认阻断回滚",
      "只读回滚演练复核固定包和目录且不改变 current 与发布历史",
      "只读演练允许复核当前版本作为滚动发布恢复基线",
    ]) &&
    releasePackageJson.includes("release:test-rollback") &&
    releasePackageJson.includes("pnpm release:test-rollback") &&
    releaseRollback.indexOf('mv -Tf "$CURRENT_ID_NEXT" "$ROOT_DIR/current-release-id"') <
      releaseRollback.indexOf('mv -Tf "$ROOT_DIR/current.next" "$ROOT_DIR/current"'),
  "回滚必须同值确认、逐文件复核已部署目录、保护数据库迁移边界、通过独立行为测试、健康部署成功后原子切换权威 current，并让兼容版本指针稳定跟随 current/.release-id",
);
add(
  "发布保留盘点保护可回滚版本并且只报告清理候选",
  hasAll(releaseRetentionAudit, [
    "current-release-id",
    "release-history.tsv",
    "last-migration",
    "current 目录内 .release-id 格式无效",
    "current-release-id 兼容指针与 current 目录不一致",
    "current 软链接与当前目录发布标识不一致",
    "保留发布包 SHA-256 不一致",
    "cleanupCandidates",
    "destructiveActionPerformed: false",
    "发布磁盘可用空间不足",
  ]) &&
    hasAll(releaseRetentionTest, [
      "destructiveActionPerformed",
      "current-release-id 兼容指针与 current 目录不一致",
      "保留发布包 SHA-256 不一致",
      "cleanupCandidates",
    ]) &&
    releasePackageJson.includes("pnpm release:test-retention"),
  "版本盘点必须保护当前、前序、最近迁移和最近成功版本，复核包哈希与磁盘余量，并且不得自动删除任何文件",
);
add(
  "上线证据聚合器统一给出 GO 或 BLOCK",
  hasAll(launchEvidenceAggregator, [
    "infrastructure-intake-readiness.json",
    "tencent-cloud-readiness.json",
    "host-preflight-readiness.json",
    "package-verification.json",
    "release-directory-verification.json",
    "client-config-binding-verification.json",
    "database-migration-verification.json",
    "environment-readiness.json",
    "runtime-verification.json",
    "retention-audit.json",
    'decision: failed.length === 0 ? "GO" : "BLOCK"',
    "observedReleaseId !== releaseId",
    "allowDegraded !== false",
    "destructiveActionPerformed !== false",
    "expectedFingerprint !== data.actualFingerprint",
    'data.verificationMode !== "final"',
    'data.sourceExportMode !== "final"',
    "prismaMigrationStatusPassed",
    "配置绑定源提交与固定包提交不一致",
    'createHash("sha256")',
  ]) &&
    hasAll(launchEvidenceTest, [
      "腾讯部署十份证据一致且有效时给出 GO",
      "标准部署无需腾讯云证据且九份证据有效时给出 GO",
      "腾讯部署缺少云资源现场审计时阻断上线",
      "腾讯云资源现场审计失败时阻断上线",
      "主机预检未通过时阻断上线",
      "新基础设施接入未达到 launch 阶段时阻断上线",
      "数据库核验不是 final 模式时阻断上线",
      "Prisma 迁移状态未通过时阻断上线",
      "客户端配置指纹不一致时阻断上线",
      "运行实例版本不一致时阻断上线",
      "公网 API 域名仍指向旧地址时阻断上线",
      "公网静态资源域名未指向腾讯云分配 CNAME 时阻断上线",
      "现场环境证据过期时阻断上线",
      "固定包验真允许 dirty 时阻断上线",
      "版本保留审计执行破坏性操作时阻断上线",
      "任一来源证据缺失时阻断上线",
    ]) &&
    releasePackageJson.includes("pnpm release:test-evidence") &&
    releasePackageJson.includes('"release:aggregate-evidence"'),
  "主机预检、新基础设施接入、包、已部署目录、客户端配置绑定、数据库迁移对账、完整环境、公网运行时和版本保留证据必须同版、有效且不可降级；腾讯部署还必须包含现场云资源审计，并记录来源哈希供签字复盘",
);
add(
  "最终上线必须同时通过机器九证据与双人签核门禁",
  hasAll(launchAcceptanceFinalizer, [
    "REQUIRED_CHECKS",
    "launch-decision.json",
    "final-launch-decision.json",
    "approve:${releaseId}",
    "approvers?.technical",
    "approvers?.business",
    "isInsideDirectory",
    'createHash("sha256")',
    'flag: "wx"',
    "--init",
  ]) &&
    hasAll(launchAcceptanceTest, [
      "标准部署机器九证据与双负责人九项验收完整时给出最终 GO",
      "腾讯部署机器十证据与双负责人九项验收完整时给出最终 GO",
      "机器上线判定不是 GO 时阻断最终上线",
      "缺少任一人工检查项时阻断最终上线",
      "技术与业务负责人是同一人时阻断最终上线",
      "证据路径逃逸发布证据目录时阻断最终上线",
      "可在发布证据目录安全初始化待签字验收表且拒绝覆盖",
    ]) &&
    releasePackageJson.includes('"release:finalize-launch"') &&
    releasePackageJson.includes("finalize-launch-acceptance.test.mjs"),
  "机器 GO 只能进入人工验收；正式上线还必须由不同技术与业务负责人签核全部 P0 项，并对归档证据逐文件计算 SHA-256 后生成 final-launch-decision.json",
);
add(
  "生产固定包所需三份客户端证据在同一 Artifact 完整交接",
  hasAll(productionClientEvidenceUpload, [
    "release-evidence/client-artifact-audit.json",
    "release-evidence/client-artifact-verification.json",
    "release-evidence/client-config-binding.json",
  ]) &&
    hasAll(deploymentWorkflow, [
      "name: production-client-evidence-${{ inputs.release_id }}",
      "--client-config-binding artifacts/client-evidence/client-config-binding.json",
      "--client-artifact-audit artifacts/client-evidence/client-artifact-audit.json",
      "--client-artifact-verification artifacts/client-evidence/client-artifact-verification.json",
    ]),
  "生产打包任务消费的客户端审计、独立验真与配置绑定三份证据，必须由同一个专用 Artifact 完整上传后再下载",
);
add(
  "生产五端成品同步生成并归档商店阻断报告",
  hasAll(deploymentWorkflow, [
    "scripts/release/audit-store-readiness.mjs",
    '--release-id "$RELEASE_ID"',
    "--report release-evidence/store-readiness.json",
    "release-evidence/store-readiness.json",
  ]) &&
    hasAll(releasePackageJson, ['"release:test-store-audit"', "pnpm release:test-store-audit"]) &&
    hasAll(read("scripts/release/audit-store-readiness.mjs"), [
      'kind: "guoxue-store-readiness"',
      "externalBlockers",
      "configurationBlockers",
      "codeBlockers",
    ]),
  "生产工作流必须随正式五端成品归档结构化商店报告，即使外部 SDK 或签名未补齐也不得丢失阻断证据",
);
add(
  "迁移现场手册的固定包命令完整传入四份生产证据",
  [
    "docs/operations/新基础设施与正式凭据交接清单-20260731.md",
    "docs/operations/服务器数据库域名迁移手册-20260728.md",
  ].every((document) =>
    hasAll(read(document), [
      "--report-dir release-evidence",
      "pnpm release:gate:full --",
      '--release-id "$RELEASE_ID"',
      'pnpm release:package "$RELEASE_ID"',
      "--client-config-binding release-evidence/client-config-binding.json",
      "--client-artifact-audit release-evidence/client-artifact-audit.json",
      "--client-artifact-verification release-evidence/client-artifact-verification.json",
      "--source-freeze-audit release-evidence/source-freeze-readiness.json",
    ]),
  ),
  "值班人员复制文档命令时必须同时提供配置绑定、客户端审计、客户端独立验真与源码冻结证据，不能在打包阶段才因缺参中断",
);
add(
  "发布总览与基线明确完整上线门禁必须绑定发布批次号",
  [
    "docs/release/新基础设施上线移交总览-20260731.md",
    "docs/release/发布基线与上线缺口-20260728.md",
  ].every((document) =>
    hasAll(read(document), ["release:gate:full", '--release-id "$RELEASE_ID"', "客户端"]),
  ),
  "任何面向发布人员的完整门禁说明都不能遗漏 release-id，否则客户端证据无法与固定包批次形成闭环",
);
add(
  "迁移现场命令动态绑定获批分支并只读取共享正式环境",
  [
    "docs/operations/新基础设施与正式凭据交接清单-20260731.md",
    "docs/operations/服务器数据库域名迁移手册-20260728.md",
  ].every((document) => {
    const content = read(document);
    return (
      content.includes('SOURCE_BRANCH="$(git branch --show-current)"') &&
      !content.includes("SOURCE_BRANCH='main'") &&
      content.includes("pnpm release:verify:runtime /opt/guoxue/shared/.env.production") &&
      !content.includes("pnpm release:verify:runtime docker/.env.production")
    );
  }),
  "复制命令不得猜测 main/master，也不得在服务器误读仓库内环境文件；正式分支取当前获批工作树，运行时只读取共享私有配置",
);
add(
  "GitHub 生产发布绑定默认分支、源提交与迁移二次确认",
  hasAll(deploymentWorkflow, [
    "workflow_dispatch:",
    "production_confirmation:",
    "migration_confirmation:",
    "PRODUCTION_DEPLOY_READY",
    "PRODUCTION_DEPLOY_TARGET",
    "PROD_NODE_A_CONFIGURED",
    "PROD_NODE_B_CONFIGURED",
    "PRODUCTION_CONFIRMATION",
    "validate-production-dispatch.mjs",
    "create-fixed-package.mjs",
    "verify-fixed-package.mjs",
    '--expected-commit "$SOURCE_COMMIT"',
    "activate-fixed-release.sh",
    "EXPECTED_COMMIT='${{ github.sha }}'",
    "pnpm release:verify:local",
    "build-clients-with-env.mjs",
    "client-artifact-audit.json",
    "create-client-config-binding.mjs",
    "client-config-binding.json",
    "production-client-evidence-${{ inputs.release_id }}",
    "--client-config-binding artifacts/client-evidence/client-config-binding.json",
    "--client-artifact-audit artifacts/client-evidence/client-artifact-audit.json",
    "--client-artifact-verification artifacts/client-evidence/client-artifact-verification.json",
    "production-clients-${{ inputs.release_id }}",
    "pnpm install --frozen-lockfile",
    "RUN_MIGRATION='${{ inputs.run_migration }}'",
    "MIGRATION_DEPLOY_CONFIRM='${{ inputs.migration_confirmation }}'",
  ]) &&
    hasAll(productionClientEvidenceUpload, [
      "release-evidence/client-artifact-audit.json",
      "release-evidence/client-artifact-verification.json",
      "release-evidence/client-config-binding.json",
    ]) &&
    hasAll(productionDispatchGate, [
      "生产确认值必须与发布标识完全一致",
      "生产发布只能从默认分支",
      "GitHub 源提交 SHA 必须是完整的 40 位十六进制值",
      "PRODUCTION_DEPLOY_READY=true",
      "PRODUCTION_DEPLOY_TARGET=standard 或 tencent",
      "PROD_HOST_A 与 PROD_SSH_FINGERPRINT_A",
      "PROD_HOST_B 与 PROD_SSH_FINGERPRINT_B",
      "RUN_MIGRATION 仅允许 true 或 false",
      "执行生产数据库迁移必须填写",
    ]) &&
    hasAll(productionDispatchGateTest, [
      "默认分支上的普通生产发布通过",
      "非默认分支生产发布被阻断",
      "生产确认值与发布标识不一致时被阻断",
      "生产迁移缺少独立确认时被阻断",
      "生产迁移具备独立确认时通过",
      "源提交不是完整 SHA 时被阻断",
      "生产就绪开关未开启时被阻断",
      "生产节点 A 的主机或 SSH 指纹未配置时被阻断",
      "生产节点 B 的主机或 SSH 指纹未配置时被阻断",
      "生产部署架构未配置时被阻断",
      "生产部署架构不是受支持值时被阻断",
    ]) &&
    releasePackageJson.includes("pnpm release:test-dispatch-gate") &&
    hasAll(productionDeployJob, [
      "environment:",
      "permissions:",
      "contents: read",
      "PROD_SSH_KEY",
      "EXPECTED_COMMIT='${{ github.sha }}'",
      "PROD_SSH_FINGERPRINT_A",
      "PROD_SSH_FINGERPRINT_B",
      "NODE_ROLE=app",
      "NODE_ROLE=operations",
      "RUN_MIGRATION=false",
      "probe-clb-failover.sh",
    ]) &&
    (productionDeployJob.match(/fingerprint:\s*\$\{\{ secrets\.PROD_SSH_FINGERPRINT_A \}\}/g)
      ?.length ?? 0) === 4 &&
    (productionDeployJob.match(/fingerprint:\s*\$\{\{ secrets\.PROD_SSH_FINGERPRINT_B \}\}/g)
      ?.length ?? 0) === 4 &&
    hasAll(deploymentWorkflow, [
      "STAGING_SSH_FINGERPRINT",
      "fingerprint: ${{ secrets.STAGING_SSH_FINGERPRINT }}",
    ]) &&
    !productionDeployJob.includes("contents: write") &&
    !productionDeployJob.includes("packages: write") &&
    !deploymentWorkflow.includes("push:\n") &&
    !deploymentWorkflow.includes("/opt/guoxue/.env.production"),
  "普通提交、标签和非默认分支不得触碰生产；迁移需独立确认，固定包提交必须与本次 GitHub 源提交在 CI 和服务器两端一致",
);
add(
  "公网切流后可按部署架构独立重跑机器证据并判定 GO",
  hasAll(productionVerificationWorkflow, [
    "workflow_dispatch:",
    "production_confirmation:",
    "PRODUCTION_DEPLOY_READY",
    "PRODUCTION_DEPLOY_TARGET",
    "PROD_NODE_A_CONFIGURED",
    "PROD_NODE_B_CONFIGURED",
    "permissions:",
    "contents: read",
    "validate-production-dispatch.mjs",
    "SOURCE_REF: ${{ github.ref }}",
    "SOURCE_SHA: ${{ github.sha }}",
    "DEFAULT_BRANCH: ${{ github.event.repository.default_branch }}",
    "host: ${{ secrets.PROD_HOST_A }}",
    "fingerprint: ${{ secrets.PROD_SSH_FINGERPRINT_A }}",
    "host: ${{ secrets.PROD_HOST_B }}",
    "fingerprint: ${{ secrets.PROD_SSH_FINGERPRINT_B }}",
    "export PLATFORM_ROOT=/opt/guoxue",
    "export RELEASE_ID='${{ inputs.release_id }}'",
    "export MAX_AGE_HOURS='${{ inputs.max_age_hours }}'",
    "export DEPLOY_TARGET='${{ vars.PRODUCTION_DEPLOY_TARGET }}'",
    "export NODE_ROLE=operations",
    "verify-production-cutover.sh",
  ]) &&
    hasAll(productionCutoverVerifier, [
      "current-release-id",
      "verify-client-config-binding.mjs",
      "client-config-binding-verification.json",
      "database-migration-verification.json",
      "infrastructure-intake.json",
      "audit-infrastructure-intake.mjs",
      "infrastructure-intake-readiness.json",
      "audit-tencent-cloud-readiness.py",
      "tencent-cloud-readiness.json",
      'DEPLOY_TARGET" = "tencent"',
      "audit-host-preflight.mjs",
      "host-preflight-readiness.json",
      '--expected-commit "$SOURCE_COMMIT"',
      "check-env.mjs",
      "verify-runtime.mjs",
      '--infrastructure-intake "$INFRASTRUCTURE_INTAKE_FILE"',
      "--expected-release-id",
      "audit-release-retention.mjs",
      "aggregate-launch-evidence.mjs",
      "launch-decision.json",
      'report.decision !== "GO"',
      "生产环境文件权限必须为 600 或 400",
      "新基础设施接入清单权限必须为 600 或 400",
    ]) &&
    !productionVerificationWorkflow.includes("contents: write") &&
    !productionCutoverVerifier.includes("docker compose up") &&
    !productionCutoverVerifier.includes("prisma migrate"),
  "首次上机激活不应被 DNS 时序绑死；公网切换后必须由独立只读工作流重建客户端配置绑定及易过期证据、核对实际版本并给出 GO/BLOCK",
);

const dbOps = read("scripts/db-ops.sh");
const legacyBackupEntry = read("scripts/backup-db.sh");
const legacyRestoreEntry = read("scripts/restore-db.sh");
const operationalDocs = [
  read("docker/RUNBOOK.md"),
  read("docs/disaster-recovery-plan.md"),
  read("docs/rollback-plan.md"),
].join("\n");
add(
  "数据库值班入口与灾备文档统一使用可校验归档",
  hasAll(dbOps, [
    'bash "$ROOT/docker/pg-backup.sh"',
    'bash "$ROOT/docker/pg-restore.sh"',
    "sha256sum --check",
    "pg_restore --list",
    'name "guoxue_*.dump"',
  ]) &&
    !dbOps.includes(".sql.gz") &&
    !operationalDocs.includes(".sql.gz") &&
    !operationalDocs.includes("gunzip -c"),
  "禁止保留绕过统一保护的 gzip SQL 恢复捷径，避免值班人员误用旧流程",
);
add(
  "历史数据库入口只委托统一受保护链路",
  hasAll(legacyBackupEntry, [
    'exec bash "$SCRIPT_DIR/db-ops.sh" backup',
    'export KEEP_DAYS="${1:-${KEEP_DAYS:-30}}"',
  ]) &&
    hasAll(legacyRestoreEntry, [
      'exec bash "$SCRIPT_DIR/db-ops.sh" restore "$BACKUP_FILE"',
      'if [[ -z "$BACKUP_FILE" ]]',
    ]) &&
    !legacyBackupEntry.includes("pg_dump") &&
    !legacyRestoreEntry.includes("dropdb") &&
    !legacyRestoreEntry.includes("sleep 5"),
  "旧命令仍可兼容值班习惯，但不得绕过并发锁、SHA-256、归档验证、恢复前快照和目标库同值确认",
);

const runbook = read("docs/operations/服务器数据库域名迁移手册-20260728.md");
add(
  "迁移手册禁止用旧库覆盖新库回滚",
  hasAll(runbook, ["DNS 切换与回滚", "回滚只恢复 DNS 和旧站写入", "不得用旧库覆盖新库"]),
  "回滚必须保护切流窗口产生的新数据",
);

const infrastructureHandoff = read("docs/release/新基础设施上线移交总览-20260731.md");
const infrastructureIntakeTemplate = read("config/release/infrastructure-intake.example.json");
const infrastructureIntakeAudit = read("scripts/release/audit-infrastructure-intake.mjs");
const infrastructureIntakePreparer = read("scripts/release/prepare-infrastructure-intake.mjs");
const infrastructureIntakeTest = read("tests/release/audit-infrastructure-intake.test.mjs");
const infrastructureIntakePrepareTest = read(
  "tests/release/prepare-infrastructure-intake.test.mjs",
);
const infrastructureOperationsGuide = read(
  "docs/operations/新基础设施与正式凭据交接清单-20260731.md",
);
add(
  "采购接入清单锁定生产系统支持矩阵",
  hasAll(infrastructureIntakeTemplate, [
    '"osFamily": "linux"',
    '"osDistribution": "ubuntu"',
    '"osVersion": "24.04"',
  ]) &&
    hasAll(infrastructureIntakeAudit, [
      'text(server.osDistribution).toLowerCase() === "ubuntu"',
      '["22.04", "24.04", "26.04"].includes(text(server.osVersion))',
      "服务器系统属于生产验收支持矩阵",
    ]) &&
    infrastructureIntakeTest.includes("采购阶段阻断未经验收的服务器发行版与版本") &&
    hasAll(infrastructureOperationsGuide, ["Ubuntu 22.04/24.04/26.04 LTS", "发行版与版本"]),
  "采购阶段必须明确记录 Ubuntu 发行版和 22.04/24.04/26.04 LTS 版本；不能等到初始化主机时才发现所购镜像不受支持",
);
add(
  "新基础设施接入门禁覆盖迁移权限、演练与旧环境回退保留",
  hasAll(infrastructureIntakeTemplate, [
    '"sourceDatabaseAccessVerified"',
    '"targetDatabaseAccessVerified"',
    '"dnsChangeAccessVerified"',
    '"rehearsalCompleted"',
    '"writeFreezeOwner"',
    '"maintenanceWindowUtc"',
    '"rollbackRetentionHours"',
    '"oldEnvironmentRetentionConfirmed"',
  ]) &&
    hasAll(infrastructureIntakeAudit, [
      "migration.sourceDatabaseAccessVerified === true",
      "migration.targetDatabaseAccessVerified === true",
      "migration.dnsChangeAccessVerified === true",
      "migration.rehearsalCompleted === true",
      "migration.oldEnvironmentRetentionConfirmed === true",
      "Number(migration.rollbackRetentionHours) >= 72",
    ]),
  "正式 launch 不仅要证明新环境可用，还必须证明源库/目标库/DNS 权限、同版迁移演练、停写窗口和旧环境回退保留均已落实",
);
add(
  "新基础设施接入门禁区分采购、预接入与最终上线三阶段",
  hasAll(infrastructureIntakeAudit, [
    '["procurement", "predeploy", "launch"]',
    'stage !== "procurement"',
    'const resourceReady = stage === "predeploy" || stage === "launch"',
    "if (launch)",
  ]) &&
    hasAll(infrastructureIntakeTest, [
      "predeploy 阶段可在迁移演练前验证真实资源和正式环境绑定",
      "predeploy 阶段拒绝占位资源或正式环境错绑且报告不泄露凭据",
    ]) &&
    hasAll(infrastructureOperationsGuide, ["--stage predeploy", "预接入门禁"]) &&
    hasAll(infrastructureHandoff, ["--stage predeploy", "预接入审计"]),
  "采购只锁定规格与责任人，预接入验证真实资源和正式环境绑定，最终 launch 再强制迁移、告警、恢复与回退演练",
);
add(
  "新基础设施私有接入清单可按架构安全初始化且拒绝覆盖",
  hasAll(infrastructureIntakePreparer, [
    'valueOf("--deploy-target")',
    'valueOf("--output"',
    "includes(deployTarget)",
    "existsSync(outputPath)",
    "拒绝覆盖",
    "mode: 0o600",
    "chmodSync(outputPath, 0o600)",
    'intake.database.topology = "self-hosted"',
    'intake.cache.topology = "self-hosted"',
  ]) &&
    read("package.json").includes('"release:prepare-infra-intake"') &&
    read("package.json").includes("tests/release/prepare-infrastructure-intake.test.mjs"),
  "新资源到位后必须从受控模板按 standard/tencent 初始化，不能覆盖已填写清单或复用旧环境配置",
);
add(
  "已登记真实资源的私有接入清单可无损升级到最新模板",
  hasAll(infrastructureIntakePreparer, [
    'hasFlag("--upgrade-existing")',
    "mergeMissingFields",
    "copyFileSync(outputPath, backupPath)",
    "existing.deployTarget !== deployTarget",
  ]) &&
    hasAll(infrastructureIntakePrepareTest, [
      "升级现有接入清单时只补缺失字段并保留原值与备份",
      "升级时拒绝改变现有部署架构",
    ]) &&
    hasAll(infrastructureOperationsGuide, ["--upgrade-existing", "只补缺失字段"]) &&
    hasAll(infrastructureHandoff, [
      "config/release/infrastructure-intake.new-target.json",
      "绑定上一轮预接入入口",
      "禁止对它执行 `--upgrade-existing`",
      "同一目标清单补充新字段",
      "禁止删除真实旧环境证据",
    ]),
  "模板新增门禁字段时仅允许升级同一批新目标清单；必须先备份并只补缺项，禁止覆盖、改架构、复用旧目标或人工重抄已登记资源",
);
add(
  "正式环境必须与新数据库、缓存、域名和对象存储接入清单逐项绑定",
  hasAll(infrastructureIntakeTemplate, ['"endpointHost"', '"bucket"', '"region"', '"clbId"']) &&
    hasAll(infrastructureIntakeAudit, [
      'valueOf("--env-file")',
      'environmentValues.get("DATABASE_URL")',
      'environmentValues.get("REDIS_URL")',
      'environmentValues.get("PUBLIC_API_URL")',
      'environmentValues.get("TENCENT_CLB_ID")',
      'environmentValues.get("COS_BUCKET")',
      'environmentValues.get("COS_REGION")',
      "storageCorsAllowedOriginsFingerprint",
      "正式环境与新基础设施接入清单完全绑定",
      "configurationBinding: reportBinding",
    ]) &&
    hostPreflightAudit.includes('arg === "--"') &&
    hostPreflightTest.includes('"--",\n      script,\n      "--"') &&
    hasAll(read("scripts/release/run-full-gate.mjs"), ['"--env-file"', "resolvedEnvFile"]) &&
    hasAll(productionCutoverVerifier, [
      '$NODE_BIN -- "$RELEASE_DIR/scripts/release/audit-infrastructure-intake.mjs"',
      '$NODE_BIN -- "$RELEASE_DIR/scripts/release/audit-host-preflight.mjs"',
      '--env-file "$ENV_FILE"',
    ]) &&
    setupServer.includes('node -- "$INSTALL_DIR/scripts/release/audit-host-preflight.mjs"') &&
    hasAll(infrastructureOperationsGuide, [
      "node -- /opt/guoxue/current/scripts/release/audit-infrastructure-intake.mjs",
      "node -- /opt/guoxue/current/scripts/release/audit-host-preflight.mjs",
    ]) &&
    infrastructureIntakeTest.includes(
      "正式环境连接到另一套数据库或对象存储时阻断且报告不泄露地址与凭据",
    ),
  "两份各自合法但指向不同资源的配置必须在预部署和公网复核阶段被机器阻断，报告不得落原始地址或凭据",
);
add(
  "新基础设施移交总览区分已验收资源与最终上线阻断",
  hasAll(infrastructureHandoff, [
    "当前不能标记为正式上线",
    "这些结果只作为流程、容量和回滚演练基线",
    "不得直接作为新目标资源的上线验收证据",
    "旧预发布已演练；新资源待采购并重验",
    "旧预发布已通；新域名待采购并重验",
    "是否沿用待确认；目标资源必须重验",
    "干净候选已形成；待默认分支复核/固定包",
    "正式发布仍须完成人工变更复核、默认分支合并与固定包生成",
    "launch-decision.json",
    "生产包必须由干净工作树生成",
    "禁止在切流后用旧库覆盖新库",
  ]) &&
    !infrastructureHandoff.includes(
      "由于新服务器、新 PostgreSQL、新 Redis、新域名、正式证书和正式凭据尚未交接",
    ),
  "已完成资源必须记录实测证据，未完成的固定发布、支付、迁移、合规与签核仍须保持阻断；历史环境只能作为迁移源或回滚保留环境",
);

const storeBaseline = JSON.parse(read("config/release/store-baseline.json"));
const mobileManifest = JSON.parse(read("apps/mobile/src/manifest.json"));
const productionCompose = read("docker/docker-compose.yml");
const productionComposeOverride = read("docker/docker-compose.prod.yml");
const expectedWechatMiniAppId = String(storeBaseline.wechatMiniAppId || "").trim();
add(
  "微信小程序、服务端与微信支付发布身份由同一商店基线锁定",
  expectedWechatMiniAppId.length > 0 &&
    mobileManifest?.["mp-weixin"]?.appid === expectedWechatMiniAppId &&
    productionEnvTemplate.includes(`WECHAT_MINI_APP_ID=${expectedWechatMiniAppId}`) &&
    productionEnvTemplate.includes(`WECHAT_PAY_APP_ID=${expectedWechatMiniAppId}`) &&
    hasAll(productionCompose, [
      "WECHAT_MINI_APP_ID: ${WECHAT_MINI_APP_ID:-}",
      "WECHAT_PAY_APP_ID: ${WECHAT_PAY_APP_ID:-}",
    ]) &&
    hasAll(productionComposeOverride, [
      "WECHAT_MINI_APP_ID: ${WECHAT_MINI_APP_ID:-}",
      "WECHAT_PAY_APP_ID: ${WECHAT_PAY_APP_ID:-}",
    ]),
  "客户端发布 AppID、正式环境模板和两套 Compose 必须统一绑定热卜星火商店基线，禁止回退到历史第三方小程序或错绑支付应用",
);

const environmentChecker = read("scripts/migration/check-env.mjs");
const environmentCheckerTest = read("tests/release/check-env.test.mjs");
add(
  "正式环境门禁阻断小程序身份回退、别名冲突与支付错绑",
  hasAll(environmentChecker, [
    '"WECHAT_MINI_APP_ID", "MINIPROGRAM_APP_ID", "WECHAT_MP_APP_ID"',
    "config/release/store-baseline.json",
    'values.get("WECHAT_PAY_APP_ID")',
    "正式环境的小程序 AppID 与受控商店发布基线不一致",
    "微信支付绑定 AppID 与受控商店发布基线不一致",
  ]) &&
    hasAll(environmentCheckerTest, [
      "完整上线拒绝正式环境指向旧小程序",
      "完整上线拒绝微信支付绑定到其他 AppID",
      "完整上线拒绝多个小程序 AppID 别名互相冲突",
      "assert.doesNotMatch",
    ]),
  "完整上线检查必须以商店发布基线为唯一身份源，并通过回归测试证明错误报告不泄露真实 AppID",
);
add(
  "正式凭据验收可审计且不泄露密钥",
  hasAll(environmentChecker, [
    'arg === "--report"',
    'arg === "--deploy-target"',
    'arg === "--node-role"',
    "完整上线检查必须通过 --deploy-target 显式指定",
    "configuredKeys: values.size",
    "success: errors.length === 0",
    "nodeRole,",
    "不含任何配置值",
    "mode: 0o600",
    '"MINIPROGRAM_APP_SECRET"',
    'errors.push("尚未形成一条完整支付通道',
    "DEPLOY_TARGET=tencent 时必须使用已验收的托管服务私网地址",
    "DEPLOY_TARGET=tencent 时 STORAGE_PROVIDER 必须为 cos",
    'if (nodeRole === "operations")',
  ]) && !environmentChecker.includes("Object.fromEntries(values)"),
  "完整上线必须至少具备一条支付通道，小程序密钥别名要与服务端一致，验收报告只能记录字段名级错误和计数",
);
add(
  "首发支付具备生产商户绑定、真实收退款、回调入账和对账门禁",
  hasAll(environmentChecker, [
    "生产配置不完整",
    "WECHAT_PAY_REFUND_NOTIFY_URL",
    "ALIPAY_SANDBOX",
    "UNIONPAY_SANDBOX",
  ]) &&
    hasAll(infrastructureIntakeAudit, [
      "paymentDelivery",
      "首发支付通道、商户身份和闭环责任已绑定",
      "首发支付通道已完成真实收款、退款、回调和对账闭环",
      "duplicateCallbackReplayVerified",
      "paymentDeliveryEvidence",
    ]) &&
    hasAll(infrastructureIntakeTest, [
      "启用支付后首发通道真实收款退款闭环必须绑定且报告脱敏",
      "启用支付后拒绝错绑商户、沙箱冒充生产和不完整退款对账",
    ]),
  "支付上线不能只证明回调 URL 可达；必须绑定正式商户并保留真实实付、退款、入账、对账和重复回调重放的脱敏证据",
);
add(
  "首发物流具备生产账号绑定、真实运单、轨迹回调和售后联动门禁",
  hasAll(environmentChecker, [
    "KUAIDI100_API_KEY",
    "KUAIDI100_CUSTOMER",
    "KUAIDI100_CALLBACK_URL",
    "KUAIDI100_SALT",
  ]) &&
    hasAll(infrastructureIntakeAudit, [
      "logisticsDelivery",
      "首发物流供应商、账号身份和履约责任已绑定",
      "首发物流供应商已完成真实运单、轨迹回调、异常件和退货联动闭环",
      "returnRefundLinkageVerified",
      "logisticsDeliveryEvidence",
    ]) &&
    hasAll(infrastructureIntakeTest, [
      "启用物流后首发供应商真实运单履约闭环必须绑定且报告脱敏",
      "启用物流后拒绝错绑账号和不完整轨迹异常退货闭环",
    ]),
  "物流上线不能只证明查询接口或回调 URL 可达；必须绑定正式账号并保留真实运单、轨迹落库、异常件、退货退款和重复回调重放的脱敏证据",
);
add(
  "直播点播与实时语音具备生产资源绑定和多端真实媒体门禁",
  hasAll(environmentChecker, [
    "LIVE_PUSH_DOMAIN",
    "LIVE_PLAY_DOMAIN",
    "VOD_SUB_APP_ID",
    "TRTC_SDK_APP_ID",
    "TRTC_SECRET_KEY",
  ]) &&
    hasAll(infrastructureIntakeAudit, [
      "mediaDelivery",
      "直播、点播与实时语音生产资源和验收责任已绑定",
      "直播、点播与实时语音已完成对应多端真实媒体闭环",
      "voiceWeakNetworkRecoveryVerified",
      "mediaDeliveryEvidence",
    ]) &&
    hasAll(infrastructureIntakeTest, [
      "启用直播点播语音后生产资源与多端真实媒体闭环必须绑定且报告脱敏",
      "启用直播点播语音后拒绝资源错绑和缺失多端真实媒体验收",
    ]),
  "媒体能力上线不能只证明域名和控制台回调存在；必须绑定正式资源，并保留直播推拉流、VOD 上传转码播放及语音多端真机与弱网恢复的脱敏证据",
);

const clientBuilder = read("scripts/release/build-clients-with-env.mjs");
const clientArtifactAudit = read("scripts/release/audit-client-artifacts.mjs");
const clientArtifactVerifier = read("scripts/release/verify-client-artifacts.mjs");
const clientArtifactTest = read("tests/release/audit-client-artifacts.test.mjs");
const clientArtifactVerifierTest = read("tests/release/verify-client-artifacts.test.mjs");
const clientConfigBindingCreator = read("scripts/release/create-client-config-binding.mjs");
const clientConfigBindingVerifier = read("scripts/release/verify-client-config-binding.mjs");
const clientConfigBindingTest = read("tests/release/client-config-binding.test.mjs");
const packageCreator = read("scripts/release/create-fixed-package.mjs");
const packageVerifier = read("scripts/release/verify-fixed-package.mjs");
const packageVerifierTest = read("tests/release/verify-fixed-package.test.mjs");
const clientEvidenceConsistency = read("scripts/release/lib/client-evidence-consistency.mjs");
const clientEvidenceConsistencyTest = read("tests/release/client-evidence-consistency.test.mjs");
const sourceFreezeAudit = read("scripts/release/audit-source-freeze.mjs");
const sourceFreezeTest = read("tests/release/audit-source-freeze.test.mjs");
const fullGateTest = read("tests/release/run-full-gate.test.mjs");
const predeployEvidenceAggregator = read("scripts/release/aggregate-predeploy-evidence.mjs");
const predeployDecisionVerifier = read("scripts/release/verify-predeploy-decision.mjs");
const predeployDecisionVerifierTest = read("tests/release/verify-predeploy-decision.test.mjs");
const predeployReadinessWorkflow = read(".github/workflows/predeploy-readiness.yml");
const predeployReadinessWorkflowTest = read("tests/release/predeploy-readiness-workflow.test.mjs");

const baseProductionCompose = read("docker/docker-compose.prod.yml");
const tencentProductionCompose = read("docker/docker-compose.tencent.yml");
const productionEnvironmentTemplate = read("docker/.env.production.example");
add(
  "托管数据库 CA 证书仅在腾讯云架构注入且保持只读",
  !baseProductionCompose.includes("TENCENTDB_CA_CERT_PATH") &&
    !baseProductionCompose.includes("NODE_EXTRA_CA_CERTS") &&
    hasAll(tencentProductionCompose, [
      "NODE_EXTRA_CA_CERTS: /run/secrets/tencentdb-ca.pem",
      "${TENCENTDB_CA_CERT_PATH:?必须提供腾讯云数据库 CA 证书路径}:/run/secrets/tencentdb-ca.pem:ro",
    ]) &&
    productionEnvironmentTemplate.includes("TENCENTDB_CA_CERT_PATH=") &&
    hasAll(read("scripts/migration/check-env.mjs"), [
      '"TENCENTDB_CA_CERT_PATH"',
      "TENCENTDB_CA_CERT_PATH 必须是 Linux 宿主机上的 PEM/CRT 绝对路径且不得包含 ..",
    ]),
  "standard 自建架构不得被腾讯云证书路径阻断；tencent 完整门禁必须要求受控宿主机 CA 证书，并以只读方式注入 Node 信任链",
);
const predeployEvidenceTest = read("tests/release/aggregate-predeploy-evidence.test.mjs");
const pnpmInvocationResolver = read("scripts/release/resolve-pnpm-invocation.mjs");
const pnpmInvocationTest = read("tests/release/resolve-pnpm-invocation.test.mjs");
const packageJson = read("package.json");
const fullGateRunner = read("scripts/release/run-full-gate.mjs");
const productionDeployWorkflow = read(".github/workflows/deploy.yml");
const infrastructureHandoffChecklist = read(
  "docs/operations/新基础设施与正式凭据交接清单-20260731.md",
);
const infrastructureMigrationManual = read("docs/operations/服务器数据库域名迁移手册-20260728.md");
const authService = read("apps/server/src/modules/auth/auth.service.ts");
const authServiceTest = read("apps/server/src/modules/auth/auth.service.spec.ts");
const jwtStrategy = read("apps/server/src/common/jwt.strategy.ts");
const jwtStrategyTest = read("apps/server/src/common/jwt.strategy.spec.ts");
const prismaSchema = read("apps/server/prisma/schema.prisma");
const authProviderUniquenessMigration = read(
  "apps/server/prisma/migrations/20260802000000_enforce_auth_provider_uniqueness/migration.sql",
);
const unifiedAccountEntitlementMigration = readOptional(
  "apps/server/prisma/migrations/20260802030000_unified_accounts_and_entitlements/migration.sql",
);
const redisService = read("apps/server/src/redis/redis.service.ts");
const storageInventoryBuilder = read("scripts/release/build-storage-inventory.mjs");
const storageInventoryComparer = read("scripts/release/compare-storage-inventories.mjs");
const storageInventoryTest = read("tests/release/storage-inventory.test.mjs");
const appLinkAssociationBuilder = read("scripts/release/build-app-link-associations.mjs");
const appLinkAssociationProbe = read("scripts/release/probe-app-link-associations.mjs");
const appLinkAssociationTest = read("tests/release/app-link-associations.test.mjs");
add(
  "登录迁域、找回密码与跨端会话纳入新基础设施交接",
  infrastructureIntakeExample.includes('"authenticationDelivery"') &&
    infrastructureIntakeExample.includes('"migratedAccountPasswordLoginVerified"') &&
    hasAll(infrastructureIntakeAuditor, [
      "登录迁域与会话验收责任已登记",
      "迁移账号登录、找回密码与会话生命周期已现场验收",
      "已启用短信与微信登录通道已逐端现场验收",
      "authenticationDeliveryEvidence",
      "sessionLifecycleVerified",
    ]) &&
    hasAll(infrastructureIntakeTest, [
      "迁移账号登录、密码找回或会话生命周期未闭环时阻断 launch",
      "正式环境启用的短信与微信登录通道必须逐端验收",
    ]) &&
    hasAll(infrastructureHandoffChecklist, [
      "登录迁域与会话闭环",
      "migratedAccountPasswordLoginVerified",
      "crossClientSessionVerified",
    ]) &&
    hasAll(infrastructureMigrationManual, ["已迁移老账号", "退出后令牌失效", "H5、小程序与 App"]),
  "正式切流不能只看登录页可达；必须用已迁移老账号验证密码、找回、刷新、退出失效和已启用短信/微信通道，并证明多端会话边界正确",
);
add(
  "迁域身份绑定与一次性会话令牌具备服务端防重放保护",
  hasAll(authService, [
    "AUTH_IDENTITY_CONFLICT",
    "this.redis.getDel(`refresh:${refreshToken}`)",
    "this.redis.getDel(`handoff:${code}`)",
  ]) &&
    (authService.includes("assertWechatIdentityCompatible") ||
      hasAll(authService, [
        "linkWechatIdentityToUser",
        "provider_namespace_subject",
        "WECHAT_UNION",
      ])) &&
    hasAll(redisService, ["async getDel(", "redis.call('GET'", "redis.call('DEL'"]) &&
    hasAll(authServiceTest, [
      "手机号用户绑定已归属其他账号的 openId 时拒绝登录",
      "同一 refreshToken 只能成功消费一次",
    ]) &&
    hasAll(businessIntegrity, ["微信认证缺少 openId", "密码认证缺少 credential"]) &&
    (hasAll(businessIntegrity, ["微信 unionId 跨账号冲突", "同一用户存在重复认证提供方"]) ||
      hasAll(businessIntegrity, ["认证作用域身份重复或跨账号冲突", "微信开放平台锚点跨账号冲突"])),
  "微信身份归属冲突必须显式失败；refresh token 与跨端握手码必须原子一次性消费，恢复后的历史认证数据也必须通过完整性门禁",
);
add(
  "对象存储迁移具备逐对象内容清单、脱敏比对与旧桶回退门禁",
  hasAll(infrastructureIntakeAuditor, [
    "对象存储迁移方案使用逐对象内容摘要",
    "对象存储源目标清单已逐对象一致性核验",
    "旧对象存储回退窗口已保留",
    "storageMigrationEvidence",
    "sha256-content-v1",
  ]) &&
    infrastructureIntakeExample.includes('"objectMigration"') &&
    hasAll(storageInventoryBuilder, [
      "guoxue-storage-inventory-summary",
      "createReadStream",
      "清单目录不得包含符号链接或联接点",
      "报告不包含目录、对象键或文件内容",
    ]) &&
    hasAll(storageInventoryComparer, [
      "guoxue-storage-inventory-comparison",
      "对象数量一致",
      "对象总字节数一致",
      "逐对象内容清单摘要一致",
    ]) &&
    hasAll(storageInventoryTest, [
      "相同目录生成的脱敏对象清单可形成 GO 证据",
      "对象内容不同即使文件大小相同也会 BLOCK",
    ]) &&
    packageJson.includes('"release:inventory-storage"') &&
    packageJson.includes('"release:compare-storage-inventory"') &&
    packageJson.includes("tests/release/storage-inventory.test.mjs") &&
    hasAll(infrastructureHandoffChecklist, [
      "对象存储旧文件迁移完整性",
      "禁止用 COS/S3 分片上传的 ETag 代替文件内容摘要",
      "停写后的最终增量复制",
    ]) &&
    hasAll(infrastructureMigrationManual, [
      "storage-comparison.json",
      "初次全量复制证据不能复用为正式切流证据",
      "旧桶至少 `72` 小时只读可恢复",
    ]),
  "正式切流必须用文件内容 SHA-256 对旧桶和新桶逐对象核验，只归档脱敏摘要，并在回退窗口内保留旧桶",
);
add(
  "新域名 App 深链具备双端身份绑定、关联文件生成、公网探测与真机门禁",
  infrastructureIntakeExample.includes('"appDeepLinks"') &&
    hasAll(infrastructureIntakeAuditor, [
      "App 深链主机、受控路径与责任已规划",
      "App 深链应用身份与现有发布包一致",
      "App 深链正式 Team ID 与 Android 签名证书已登记",
      "App 深链关联文件、客户端能力与真机跳转已现场验收",
      "appDeepLinkEvidence",
      "appLinkHost",
    ]) &&
    hasAll(appLinkAssociationBuilder, [
      "apple-app-site-association",
      "assetlinks.json",
      "com.apple.developer.associated-domains",
      "com.rebu.iosapprebu",
      "com.rebu.apprebu",
      "sha256_cert_fingerprints",
    ]) &&
    hasAll(appLinkAssociationProbe, [
      'redirect: "manual"',
      "application/pkcs7-mime",
      "expectedIdentityFingerprint",
      "guoxue-app-link-association-probe",
    ]) &&
    hasAll(appLinkAssociationTest, [
      "生成与现有双端应用身份一致的 Universal Link 和 App Link 文件",
      "错误包名或签名指纹会在写出关联文件前阻断",
      "占位域名与非受控路径不能生成公网关联文件",
    ]) &&
    packageJson.includes('"release:build-app-links"') &&
    packageJson.includes('"release:probe-app-links"') &&
    packageJson.includes("tests/release/app-link-associations.test.mjs") &&
    hasAll(infrastructureHandoffChecklist, [
      "apple-app-site-association",
      "assetlinks.json",
      "iOS 与 Android 真机",
    ]) &&
    hasAll(infrastructureMigrationManual, [
      "release:build-app-links",
      "release:probe-app-links",
      "Associated Domains",
      "autoVerify",
    ]),
  "迁移新域名后必须重新生成并无重定向部署 iOS/Android 关联文件，绑定既有包身份和正式签名，最后用双端真机冷启动验证",
);
add(
  "新服务器外部依赖具备固定出站身份、逐服务鉴权冒烟与来源白名单门禁",
  infrastructureIntakeExample.includes('"expectedEgressIpv4"') &&
    infrastructureIntakeExample.includes('"outboundDependencies"') &&
    hasAll(infrastructureIntakeAuditor, [
      "isPublicIpv4",
      "deriveOutboundDependencyIds",
      "新服务器固定公网出口身份已登记",
      "外部依赖清单与正式环境启用能力完全一致",
      "新服务器出口身份与全部外部依赖已现场验收",
      "outboundAccessEvidence",
      "outboundDependencyFingerprint",
    ]) &&
    hasAll(infrastructureIntakeTest, [
      "外部依赖必须按正式环境启用能力逐项验收且报告不泄露出口 IP",
      "采购阶段允许在新服务器到位前暂不登记实际出口地址",
      "launch 阶段拒绝漏登记启用依赖、保留地址和未完成的鉴权冒烟",
    ]) &&
    hasAll(infrastructureHandoffChecklist, [
      "新服务器出站依赖交接",
      "providerSourceIpPolicyVerified",
      "不落原始 IP、服务地址或任何 Secret",
    ]) &&
    hasAll(infrastructureMigrationManual, [
      "新服务器出站身份",
      "不得为了探测发送真实短信",
      "来源 IP 白名单",
    ]),
  "迁移到新服务器后不能只证明环境变量已填写；必须登记固定公网出口，按正式启用能力逐项验证 DNS/TLS、最小鉴权请求和供应商来源 IP 策略，且报告只保留脱敏摘要",
);
add(
  "新域名邮件发送具备协议、发件域信誉与真实投递门禁",
  infrastructureIntakeExample.includes('"emailDelivery"') &&
    infrastructureIntakeExample.includes('"spfVerified"') &&
    infrastructureIntakeExample.includes('"complaintHandlingVerified"') &&
    hasAll(infrastructureIntakeAuditor, [
      "邮件发送域、退信域和交付责任已绑定",
      "邮件域名信誉、退信投诉与真实投递已现场验收",
      "emailDeliveryEvidence",
    ]) &&
    hasAll(infrastructureIntakeTest, [
      "启用邮件后发送域与信誉验收必须绑定且报告不泄露原始域名",
      "启用邮件后拒绝发送域错绑和未完成的投递治理",
    ]) &&
    hasAll(environmentChecker, [
      "EMAIL_MODE 仅允许 smtp、api 或 disabled",
      "SMTP 邮件配置不完整",
      "生产邮件 API 必须使用 HTTPS",
      "当前内置 SMTP 客户端仅支持 465",
    ]) &&
    hasAll(environmentCheckerTest, [
      "SMTP一旦启用就必须具备完整凭据、合法端口和发件人",
      "当前SMTP客户端拒绝587等非隐式TLS端口",
      "邮件API必须显式使用HTTPS且配置完整",
    ]) &&
    hasAll(infrastructureHandoffChecklist, ["SPF、DKIM、DMARC", "至少一封真实投递"]) &&
    hasAll(infrastructureMigrationManual, ["EMAIL_MODE=smtp", "465 隐式 TLS", "投诉、退订"]),
  "邮件不能只验证端口和密钥；发送协议、发件域、DNS 信誉、退信投诉、退订与真实投递必须在新服务器和新域名下共同验收，报告仅保留脱敏指纹",
);
add(
  "新服务器短信具备签名模板审核、真实投递、回执与登录兜底门禁",
  infrastructureIntakeExample.includes('"smsDelivery"') &&
    infrastructureIntakeExample.includes('"alternateLoginVerified"') &&
    hasAll(infrastructureIntakeAuditor, [
      "短信签名、模板和交付责任已绑定",
      "短信签名模板、回执、真实投递与登录兜底已现场验收",
      "smsDeliveryEvidence",
    ]) &&
    hasAll(infrastructureIntakeTest, [
      "启用短信后签名模板、回执和真实投递验收必须绑定且报告脱敏",
      "启用短信后拒绝错绑模板、未审核签名和缺失登录兜底",
    ]) &&
    hasAll(environmentChecker, [
      "短信配置不完整",
      "SMS_APP_ID 必须是腾讯云短信控制台登记的纯数字 SdkAppId",
      "SMS_TEMPLATE_ID 必须是审核通过的纯数字验证码模板 ID",
    ]) &&
    hasAll(environmentCheckerTest, ["短信配置一旦启用就必须具备完整凭据和合法审核标识"]) &&
    hasAll(infrastructureHandoffChecklist, [
      "短信投递与登录兜底",
      "状态回执",
      "其他登录入口仍可用",
    ]) &&
    hasAll(infrastructureMigrationManual, [
      "externalEndpoints.smsDelivery",
      "受控真实号码投递",
      "订阅、频控和退订策略",
    ]),
  "短信不能只验证 API 可达；签名、验证码/召回模板审核、受控真实号码投递、状态回执、登录兜底及用户订阅退订必须分别验收，报告仅保留脱敏指纹",
);
add(
  "构建机候选门禁不会冒充最终生产上线 GO",
  !fullGateRunner.includes("完整上线门禁通过") &&
    hasAll(fullGateRunner, [
      "构建机 launch 候选门禁通过",
      "尚未生成最终上线 GO",
      "release:aggregate-evidence",
      "release:finalize-launch",
    ]) &&
    hasAll(fullGateTest, [
      "构建机 launch 候选门禁不得冒充最终上线 GO",
      "assert.doesNotMatch(source, /完整上线门禁通过/u)",
      "release:aggregate-evidence",
      "release:finalize-launch",
    ]) &&
    hasAll(infrastructureHandoffChecklist, [
      "构建机 launch 候选门禁",
      "不是最终上线 GO",
      "final-launch-decision.json",
    ]) &&
    hasAll(infrastructureMigrationManual, [
      "构建机候选固定包门禁通过",
      "绝不等于最终生产上线 `GO`",
      "final-launch-decision.json=GO",
    ]),
  "release:gate:full 只生成候选固定包所需构建证据；服务器现场机器聚合与不同技术、业务负责人的双签全部通过后，才能宣布最终上线",
);
add(
  "正式资源到位后可在耗时构建前执行单命令预接入门禁",
  packageJson.includes(
    '"release:gate:predeploy": "node -- scripts/release/run-full-gate.mjs --stage predeploy"',
  ) &&
    packageJson.includes('"release:aggregate-predeploy"') &&
    packageJson.includes('"release:test-predeploy-evidence"') &&
    packageJson.includes("pnpm release:test-predeploy-evidence") &&
    hasAll(fullGateRunner, [
      'arg === "--stage"',
      '["predeploy", "launch"]',
      'stage === "predeploy"',
      "尚未执行耗时构建、客户端重建或 launch 现场验收",
      '"infrastructure-intake-predeploy.json"',
      '"infrastructure-intake-readiness.json"',
      '"release:aggregate-predeploy"',
      '"predeploy-decision.json"',
      "const predeployStepFailures = []",
      'continueOnFailure: stage === "predeploy"',
      "已继续执行其余只读审计",
      "rmSync(path.join(resolvedReportDirectory, reportName), { force: true })",
    ]) &&
    hasAll(predeployEvidenceAggregator, [
      'kind: "guoxue-predeploy-decision"',
      'decision = failed.length === 0 ? "GO" : "BLOCK"',
      '"source-freeze-readiness.json"',
      '"infrastructure-intake-predeploy.json"',
      '"environment-readiness.json"',
      'createHash("sha256")',
      "freeze.sourceCommit === expectedCommit",
      'infrastructure.stage === "predeploy"',
      "environment.deployTarget === deployTarget",
      "blockers: sourceBlockers.map",
      "阻断项（${report.blockers.length}）",
      "[${blocker.source}] ${blocker.check}",
      "详情见脱敏源报告",
    ]) &&
    hasAll(predeployEvidenceTest, [
      "三份有效证据聚合为脱敏 GO 判定",
      "源码提交或分支身份不一致时判定 BLOCK",
      "基础设施报告不是 predeploy 阶段时判定 BLOCK",
      "正式环境失败或部署架构不一致时判定 BLOCK",
      "过期证据即使内容通过也判定 BLOCK",
      "缺少子审计报告时仍落盘统一 BLOCK 判定",
      "基础设施阻断项名称进入统一报告但不复制详情或配置值",
    ]) &&
    hasAll(infrastructureHandoffChecklist, [
      "统一预接入门禁",
      "release:gate:predeploy",
      "predeploy-decision.json",
      "只用于排查单项失败，不能代替统一门禁",
    ]) &&
    hasAll(fullGateTest, [
      "预接入与完整上线门禁拒绝未知阶段且不会启动子门禁",
      "predeploy 子审计失败后仍继续聚合并输出统一 BLOCK 报告",
      "predeploy 启动前清理固定报告名以阻断旧证据误判",
    ]),
  "新域名、数据库、Redis、对象存储和证书到位后先校验源码身份、资源清单、正式环境及逐项绑定；任一子审计失败仍继续完成其余只读审计并生成不含连接串或凭据的单一 BLOCK 判定，且复用目录时不得误用旧报告",
);
add(
  "新基础设施可通过受保护的手动工作流完成只读预接入验收",
  hasAll(predeployReadinessWorkflow, [
    "workflow_dispatch:",
    "environment:",
    "name: production",
    "permissions:",
    "contents: read",
    "DISPATCH_OPERATION: predeploy",
    'RUN_MIGRATION: "false"',
    "PRODUCTION_ENV_FILE_CONTENT",
    "INFRASTRUCTURE_INTAKE_FILE_CONTENT",
    "umask 077",
    "chmod 0600",
    "release:gate:predeploy",
    "continue-on-error: true",
    "--max-age-hours",
    "--safety-only",
    "steps.evidence_safety.outcome == 'success'",
    "predeploy-decision.json",
    "rm -f --",
  ]) &&
    !predeployReadinessWorkflow.includes("appleboy/ssh-action") &&
    !predeployReadinessWorkflow.includes("appleboy/scp-action") &&
    hasAll(productionDispatchGate, [
      '"deploy", "verify", "predeploy"',
      'values.operation !== "predeploy"',
      "predeploy 只读预接入验收禁止执行数据库迁移",
    ]) &&
    hasAll(productionDispatchGateTest, [
      "默认分支上的只读预接入验收不要求激活开关或双节点 Secret",
      "只读预接入验收禁止携带数据库迁移开关",
    ]) &&
    hasAll(fullGateRunner, [
      'arg === "--max-age-hours"',
      '"--max-age-hours"',
      "String(maxAgeHours)",
    ]) &&
    hasAll(predeployDecisionVerifier, [
      "guoxue-predeploy-decision",
      "预接入统一判定不是 GO",
      "源证据文件集合不完整或重复",
      "统一判定报告包含连接串、网址、私钥或本机路径",
      'arg === "--safety-only"',
      "requireGo: !options.safetyOnly",
    ]) &&
    hasAll(predeployDecisionVerifierTest, [
      "当前默认分支、提交和部署架构的完整 GO 报告通过验真",
      "统一报告意外包含连接串、网址、私钥或本机路径时拒绝上传",
      "安全归档模式允许结构完整的 BLOCK",
    ]) &&
    hasAll(predeployReadinessWorkflowTest, [
      "预接入工作流只能手动触发且受 production Environment 保护",
      "预接入工作流只读运行且禁止迁移、SSH、部署和 DNS 修改通道",
      "非脱敏报告拒绝上传",
    ]) &&
    packageJson.includes('"release:verify-predeploy-decision"') &&
    packageJson.includes("tests/release/predeploy-readiness-workflow.test.mjs") &&
    packageJson.includes("tests/release/verify-predeploy-decision.test.mjs") &&
    hasAll(infrastructureHandoffChecklist, [
      "Verify New Infrastructure Intake",
      "PRODUCTION_ENV_FILE_CONTENT",
      "只上传 `predeploy-decision.json`",
    ]) &&
    hasAll(infrastructureMigrationManual, [
      "Verify New Infrastructure Intake",
      "INFRASTRUCTURE_INTAKE_FILE_CONTENT",
      "不能替代最终 `launch`",
    ]),
  "资源购买后允许经 production Environment 审批在默认分支一键执行预接入；工作流必须只读、临时文件权限收紧且必清理，只归档通过二次脱敏检查的统一判定，并且不能冒充迁移演练或最终上线",
);
add(
  "迁移现场文档区分公网 TLS 与托管数据服务证书链",
  hasAll(infrastructureHandoffChecklist, [
    "TENCENTDB_CA_CERT_PATH",
    "/opt/guoxue/shared/tencentdb-ca.pem",
    "由 Compose 只读注入应用信任链",
    "禁止提交证书正文、使用相对路径或关闭证书校验",
  ]) &&
    hasAll(infrastructureMigrationManual, [
      "公网 HTTPS 由 CLB 承担，托管数据服务独立校验证书链",
      "TENCENTDB_CA_CERT_PATH=/opt/guoxue/shared/tencentdb-ca.pem",
      "不得用 `rejectUnauthorized=false` 绕过验证",
    ]),
  "CLB 只负责公网 HTTPS；腾讯云 PostgreSQL/Redis 必须使用受控 CA 严格校验，迁移手册不得把两条 TLS 链路混为一谈",
);
add(
  "Windows 构建机重启或换机后可通过 Corepack 运行完整门禁",
  hasAll(pnpmInvocationResolver, [
    'path.join(path.dirname(nodeExecutable), "node_modules", "corepack", "dist", "pnpm.js")',
    'source: "corepack"',
    'source: "npm_execpath"',
    'source: "pnpm-shim"',
  ]) &&
    hasAll(pnpmInvocationTest, [
      "Windows 构建机可直接使用 Node 同目录的 Corepack pnpm 入口",
      "当前 pnpm 运行时入口优先于 Corepack 兜底",
      "缺少所有直接入口时返回 null",
      "Linux 构建机继续使用 PATH 中的 pnpm",
    ]) &&
    hasAll(fullGateRunner, [
      'import { resolvePnpmInvocation } from "./resolve-pnpm-invocation.mjs"',
      "找不到可由 Node 直接运行的 pnpm 或 Corepack CLI",
    ]),
  "完整上线门禁不能依赖某次会话残留的项目内 pnpm.cjs；Windows 优先复用当前运行时，并以 Node 自带 Corepack 为稳定兜底",
);
add(
  "固定发布包默认拒绝脏工作树并支持上传后逐文件验真",
  hasAll(packageCreator, [
    'arg === "--allow-dirty"',
    "工作树存在未提交改动，拒绝生成生产固定包",
    "RELEASE-MANIFEST.json",
    ".release-id",
    "sha256",
    'arg === "--client-config-binding"',
    'arg === "--client-artifact-audit"',
    'arg === "--source-freeze-audit"',
    "release-evidence/client-config-binding.json",
    "release-evidence/client-artifact-audit.json",
    "release-evidence/source-freeze-readiness.json",
    "audit?.expectedCommit",
    "audit?.expectedBranch",
    "audit?.branch",
  ]) &&
    hasAll(packageVerifier, [
      'spawnSync("tar", ["--quoting-style=literal", "-tzf", archiveName]',
      'spawnSync("tar", ["--quoting-style=literal", "-tvzf", archiveName]',
      "cwd: archiveDirectory",
      '"--no-same-owner"',
      "entryStat.isSymbolicLink()",
      "固定发布包 SHA-256 不匹配",
      "发布包包含清单外文件",
      "生产验真默认拒绝脏工作树发布包",
      'arg === "--expected-commit"',
      "发布提交 SHA 不匹配",
      "scripts/release/aggregate-launch-evidence.mjs",
      "scripts/release/verify-client-config-binding.mjs",
      "release-evidence/client-config-binding.json",
      "release-evidence/client-artifact-audit.json",
      "release-evidence/source-freeze-readiness.json",
      "audit?.expectedCommit",
      "audit?.expectedBranch",
      "audit?.branch",
      "mode: 0o600",
    ]) &&
    hasAll(packageVerifierTest, [
      "固定包提交 SHA 与工作流源提交一致时通过",
      "固定包提交 SHA 与工作流源提交不一致时阻断",
      "冻结审计源提交与固定包提交不一致时阻断",
      "冻结审计来源分支与预期正式分支不一致时阻断",
    ]) &&
    hasAll(sourceFreezeAudit, [
      'arg === "--strict"',
      'arg === "--expected-branch"',
      'arg === "--expected-commit"',
      '"status", "--porcelain=v1"',
      '"ls-files", "--others", "--exclude-standard"',
      '"diff", "--check"',
      "readyForProductionPackage",
      "疑似敏感文件名",
      "expectedBranch",
      "expectedCommit",
    ]) &&
    hasAll(sourceFreezeTest, [
      "干净工作树通过严格冻结审计",
      "耗时构建前阻断正式门禁",
      "不会被误判为真实密钥",
      "严格冻结拒绝错误来源分支或提交",
    ]) &&
    hasAll(fullGateRunner, [
      'arg === "--expected-branch"',
      'arg === "--expected-commit"',
      '"release:audit-source-freeze"',
      '"source-freeze-readiness.json"',
      '"--expected-branch"',
      '"--expected-commit"',
    ]) &&
    hasAll(fullGateTest, [
      "完整上线门禁缺少预期正式分支时在构建前阻断",
      "完整上线门禁拒绝缺失或非法的四十位源提交",
      "/\\[full-gate\\]/u",
    ]) &&
    hasAll(productionDeployWorkflow, [
      "生成打包工作树冻结证据",
      '--expected-branch "${{ github.event.repository.default_branch }}"',
      '--expected-commit "${{ github.sha }}"',
      "--source-freeze-audit artifacts/client-evidence/source-freeze-readiness.json",
    ]) &&
    packageJson.includes('"release:verify:package"') &&
    packageJson.includes('"release:test-package-verifier"') &&
    packageJson.includes('"release:test-source-freeze"'),
  "耗时构建前先生成不含源码内容的冻结清单；生产包必须来自干净工作树，上传后复核包级与文件级哈希、源提交、路径、类型、额外文件、疑似密钥和必要运行文件",
);
const gitIgnore = read(".gitignore");
const dockerIgnore = read(".dockerignore");
const privateInfrastructureIntakeIgnoreRules = [
  "config/release/infrastructure-intake.json",
  "config/release/infrastructure-intake.json.backup-*",
  "config/release/infrastructure-intake.new-target.json",
  "config/release/infrastructure-intake.new-target.json.backup-*",
];
const privateBuildContextIgnoreRulePairs = [
  ["/artifacts/", "artifacts"],
  ["/backups/", "/backups/"],
  ["release-evidence/*.json", "release-evidence"],
  ["docker/.runtime-current.env", "docker/.runtime-current.env"],
  ["config/release/store-release-evidence.json", "config/release/store-release-evidence.json"],
  ["uploads/", "uploads"],
  ["*.key", "*.key"],
  ["*.crt", "*.crt"],
  ["docker/nginx/ssl/", "docker/nginx/ssl"],
  ["docker/monitoring/.generated/", "docker/monitoring/.generated"],
  [
    "apps/server/scripts/classics-prod-payload.json*",
    "apps/server/scripts/classics-prod-payload.json*",
  ],
];
const gitIgnoreRules = gitIgnore.split(/\r?\n/u);
const dockerIgnoreRules = dockerIgnore.split(/\r?\n/u);
add(
  "本地验收材料不会混入源码基线或容器构建上下文",
  privateBuildContextIgnoreRulePairs.every(
    ([gitRule, dockerRule]) =>
      gitIgnoreRules.includes(gitRule) && dockerIgnoreRules.includes(dockerRule),
  ) &&
    privateInfrastructureIntakeIgnoreRules.every(
      (rule) => gitIgnoreRules.includes(rule) && dockerIgnoreRules.includes(rule),
    ),
  "构建包、用户上传、证书、运行时与商店验收证据、古籍生产载荷及新旧目标私有接入清单保留在本机，但必须同时从 Git 和 Docker 上下文排除",
);
add(
  "五端客户端构建强制注入生产公开配置",
  hasAll(clientBuilder, [
    "VITE_API_URL",
    "VITE_PUBLIC_H5_URL",
    "VITE_PUBLIC_ASSET_ORIGIN",
    'await runPnpm(["build:admin"]',
    'await runPnpm(["build:mobile:all"]',
    "placeholderPattern",
  ]) &&
    packageJson.includes(
      '"build:mobile:all": "pnpm build:mobile:h5 && pnpm build:mobile:mp-weixin && pnpm build:mobile:app && pnpm build:mobile:app-harmony"',
    ) &&
    packageJson.includes('"release:gate:full": "node -- scripts/release/run-full-gate.mjs"') &&
    packageJson.includes(
      '"release:audit-infra-intake": "node -- scripts/release/audit-infrastructure-intake.mjs"',
    ) &&
    packageJson.includes(
      '"release:audit-host-preflight": "node -- scripts/release/audit-host-preflight.mjs"',
    ) &&
    hasAll(fullGateRunner, [
      'arg === "--"',
      'arg === "--env-file"',
      'arg === "--deploy-target"',
      'arg === "--infrastructure-intake"',
      'arg === "--release-id"',
      "禁止静默使用仓库内历史环境文件",
      '"release:verify:local"',
      '"release:build:clients"',
      '"release:audit-client-artifacts"',
      '"release:verify-client-artifacts"',
      '"release:create-client-config-binding"',
      '"environment-readiness.json"',
      '"infrastructure-intake-readiness.json"',
      '"client-artifact-audit.json"',
      '"client-artifact-verification.json"',
      '"client-config-binding.json"',
    ]),
  "后台、H5、小程序、App 和 Harmony 必须由同一份生产环境文件构建，禁止依赖开发机残留环境变量",
);
add(
  "五端成品发布前执行域名与源码映射审计",
  hasAll(clientArtifactAudit, [
    "apps/admin/dist",
    "apps/mobile/dist/build/h5",
    "apps/mobile/dist/build/mp-weixin",
    "apps/mobile/dist/build/app",
    "apps/mobile/dist/build/app-harmony",
    'const legacyHostParts = ["api", "rebugx", "cn"]',
    'const legacyOrigin = `https://${legacyHostParts.join(".")}`',
    'extname(file).toLowerCase() === ".map"',
    '"example.com"',
    'arg === "--report"',
    'arg === "--release-id"',
  ]) &&
    hasAll(clientArtifactTest, [
      "五类客户端成品均包含正式公开配置时生成成功报告",
      "任一客户端成品包含源码映射时失败但仍落盘审计报告",
    ]) &&
    packageJson.includes("pnpm release:test-client-artifacts"),
  "所有可发布成品都必须包含新域名且不得残留旧域名、占位域名或源码映射文件",
);
add(
  "五端成品与源码提交及确定性内容指纹绑定",
  hasAll(clientBuilder, [
    'import { resolvePnpmInvocation } from "./resolve-pnpm-invocation.mjs"',
    "pnpm.command",
    "...pnpm.prefix",
  ]) &&
    hasAll(clientArtifactAudit, [
      'import { createHash } from "node:crypto"',
      'arg === "--source-commit"',
      "schemaVersion: 2",
      "contentSha256",
      "sourceCommit",
      "bytes",
    ]) &&
    hasAll(packageCreator, [
      "audit?.schemaVersion !== 2",
      "audit?.sourceCommit ||",
      "target?.contentSha256",
    ]) &&
    hasAll(packageVerifier, [
      "audit?.schemaVersion !== 2",
      "audit?.sourceCommit ||",
      "target?.contentSha256",
    ]) &&
    hasAll(productionDeployWorkflow, [
      'node scripts/release/audit-client-artifacts.mjs "$CLIENT_ENV"',
      '--source-commit "$SOURCE_COMMIT"',
    ]),
  "五端构建必须经稳定 Corepack 入口重建，并在打包前记录源码提交、字节数和 SHA-256 内容指纹",
);
add(
  "五端成品下载或转交后可独立复验并阻断拿错包与篡改",
  hasAll(clientArtifactVerifier, [
    'arg === "--expected-release-id"',
    'arg === "--expected-commit"',
    "客户端成品与审计指纹不一致",
    "targetDirectories",
    "contentSha256",
    "sourceMaps === 0",
  ]) &&
    hasAll(clientArtifactVerifierTest, [
      "五端下载成品与审计指纹完全一致时通过独立验真",
      "任一下载成品被改动时阻断并保留验真报告",
      "发布标识或源码提交与本次交付不一致时阻断",
    ]) &&
    hasAll(productionDeployWorkflow, [
      "verify-client-artifacts.mjs",
      "client-artifact-verification.json",
    ]) &&
    packageJson.includes('"release:verify-client-artifacts"') &&
    packageJson.includes("tests/release/verify-client-artifacts.test.mjs"),
  "下载、转交或提交应用商店前必须重算五端文件数、字节数和内容指纹，并核对发布标识与源提交",
);
add(
  "五端独立验真报告必须封入固定发布包并与原审计指纹逐目标绑定",
  hasAll(packageCreator, [
    'arg === "--client-artifact-verification"',
    '"release-evidence/client-artifact-verification.json"',
    "客户端成品独立验真报告未通过或与固定包发布标识不一致",
  ]) &&
    hasAll(packageVerifier, [
      '"release-evidence/client-artifact-verification.json"',
      "auditTargets",
      "target.contentSha256 === audited.contentSha256",
      "客户端成品独立验真报告未通过、未与审计指纹一致或发布身份不匹配",
    ]) &&
    hasAll(productionDeployWorkflow, [
      "--client-artifact-verification artifacts/client-evidence/client-artifact-verification.json",
    ]) &&
    packageVerifierTest.includes("客户端成品独立验真报告与固定包发布标识不一致时阻断"),
  "固定包不得只携带构建侧审计声明，必须同时携带下载后重算得到的独立验真证据并逐目标核对",
);
add(
  "固定包生成阶段提前交叉核对客户端审计与独立验真明细",
  hasAll(packageCreator, [
    "assertClientEvidenceConsistency",
    "clientArtifactAudit",
    "clientArtifactVerification",
  ]) &&
    hasAll(clientEvidenceConsistency, [
      "客户端目标文件数不一致",
      "客户端目标字节数不一致",
      "客户端目标内容指纹不一致",
      "客户端独立验真报告缺少目标",
      "客户端独立验真报告包含审计范围外目标",
    ]) &&
    hasAll(clientEvidenceConsistencyTest, [
      "五端审计与独立验真明细完全一致时通过",
      "同一发布批次混入其他客户端内容指纹时阻断",
      "目标缺失、重复或聚合计数漂移时阻断",
    ]) &&
    packageJson.includes("tests/release/client-evidence-consistency.test.mjs"),
  "打包器必须在归档前逐端比较文件数、字节数与内容 SHA-256，不能只相信两份报告各自声明成功",
);
add(
  "CI 客户端审计配置与服务器实际构建配置使用不可伪造的发布指纹绑定",
  hasAll(clientConfigBindingCreator, [
    "guoxue-client-public-config-binding",
    "VITE_API_URL",
    "VITE_PUBLIC_H5_URL",
    "VITE_PUBLIC_ASSET_ORIGIN",
    'createHash("sha256")',
    "sourceCommit",
  ]) &&
    hasAll(clientConfigBindingVerifier, [
      "服务器生产环境的客户端公开配置与 CI 审计配置不一致",
      "--expected-release-id",
      "--expected-commit",
      "actualFingerprint",
    ]) &&
    hasAll(releaseActivator, [
      "verify-client-config-binding.mjs",
      "client-config-binding-verification.json",
      "client-config-binding.json",
    ]) &&
    hasAll(clientConfigBindingTest, [
      "一致时通过且绑定文件不落原始 URL",
      "任一客户端公开配置与 CI 审计配置不一致时阻断",
      "发布标识或源提交与本次发布不一致时阻断",
    ]) &&
    packageJson.includes("pnpm release:test-client-config-binding"),
  "固定包必须携带配置指纹和五端审计报告；服务器重新构建前必须证明共享生产环境与 CI 审计输入完全一致，报告不记录原始 URL",
);

console.log("基础设施迁移门禁");
add(
  "账号换绑、认证唯一性与撤销时钟具备数据库级保护",
  ((prismaSchema.includes("@@unique([userId, provider])") &&
    hasAll(authProviderUniquenessMigration, [
      'GROUP BY "userId", provider',
      "HAVING count(*) > 1",
      'CREATE UNIQUE INDEX IF NOT EXISTS "Auth_userId_provider_key"',
    ]) &&
    !authProviderUniquenessMigration.includes("DROP INDEX")) ||
    (prismaSchema.includes("@@unique([provider, namespace, subject])") &&
      hasAll(unifiedAccountEntitlementMigration, [
        'ADD COLUMN IF NOT EXISTS "namespace"',
        'ADD COLUMN IF NOT EXISTS "subject"',
        'WHERE "subject" IS NULL',
        'DROP INDEX IF EXISTS "Auth_userId_provider_key"',
        'CREATE UNIQUE INDEX IF NOT EXISTS "Auth_provider_namespace_subject_key"',
      ]))) &&
    hasAll(authService, [
      "sessionIssuedAt: Date.now()",
      "this.prisma.$transaction(async (tx)",
      "await this.revokeAllRefreshTokens(userId)",
    ]) &&
    hasAll(jwtStrategy, [
      "sessionIssuedAt?: number",
      "payload.sessionIssuedAt ??",
      "payload.iat * 1000",
    ]) &&
    hasAll(authServiceTest, [
      "在同一事务内更新手机号身份与用户资料，并撤销旧会话",
      "并发换绑触发数据库唯一约束时返回手机号已占用",
    ]) &&
    hasAll(jwtStrategyTest, [
      "毫秒级签发时间避免同一秒重新登录被误判为旧会话",
      "仍拒绝毫秒级撤销时刻之前签发的新格式令牌",
    ]),
  "手机号等单作用域身份保持唯一，微信身份按应用作用域绑定并由开放平台锚点跨端归一；换绑必须事务提交并撤销旧会话，同时不能因 JWT 秒级 iat 误伤同秒重新登录",
);

const serverConfigSource = read("apps/server/src/config/server-config.ts");
const websocketGatewaySource = read("apps/server/src/modules/websocket/websocket.gateway.ts");
const h5LinkConsumers = [
  "apps/server/src/modules/ai/marketing-content.service.ts",
  "apps/server/src/modules/mentorship/mentorship.service.ts",
  "apps/server/src/modules/paipan/couple.service.ts",
  "apps/server/src/modules/recommend/smart-feed.service.ts",
  "apps/server/src/modules/share/share.service.ts",
  "apps/server/src/modules/shared-reading/shared-reading.service.ts",
  "apps/server/src/modules/shop/shop-attribution.service.ts",
  "apps/server/src/modules/shop/shop-payment.service.ts",
].map(read);
const mobileAuthStorage = read("apps/mobile/src/utils/storage.ts");
const mobileAuthConsumers = [
  "apps/mobile/src/utils/request.ts",
  "apps/mobile/src/pkg-auth/login/index.vue",
  "apps/mobile/src/pkg-auth/register/index.vue",
  "apps/mobile/src/pkg-mine/change-password/index.vue",
  "apps/mobile/src/pkg-mine/settings/index.vue",
].map(read);
const adminAuthSession = read("apps/admin/src/utils/auth-session.ts");
const adminAuthConsumers = ["apps/admin/src/api/index.ts", "apps/admin/src/store/auth.ts"].map(
  read,
);
add(
  "新域名公网入口与跨账号私有缓存统一收口",
  hasAll(serverConfigSource, [
    "normalizeOriginList",
    "publicH5BaseUrl",
    "publicAssetOrigin",
    "wsCorsOrigin",
    "return this.isProduction",
  ]) &&
    hasAll(websocketGatewaySource, [
      'import { serverConfig } from "../../config/server-config"',
      "origin: serverConfig.wsCorsOrigin",
    ]) &&
    h5LinkConsumers.every(
      (source) => source.includes("serverConfig") && !source.includes("process.env.H5_BASE_URL"),
    ) &&
    hasAll(mobileAuthStorage, [
      "clearAuthSession",
      "AUTH_SESSION_KEYS",
      "AUTH_SESSION_PREFIXES",
      "preserveLoginRedirect",
    ]) &&
    mobileAuthConsumers.every((source) => source.includes("clearAuthSession")) &&
    hasAll(adminAuthSession, ["clearAdminSession", "user_roles", "admin_assistant_chat"]) &&
    adminAuthConsumers.every((source) => source.includes("clearAdminSession")),
  "迁域链接、HTTP/WS 来源白名单必须统一由配置中心生成；H5 与后台换账号、退出或会话失效时必须清理上一账号私有缓存",
);

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}：${item.detail}`);
}

const failed = checks.filter((item) => !item.pass);
console.log(`\n结果：${checks.length - failed.length}/${checks.length} 通过`);
if (failed.length > 0) {
  process.exitCode = 1;
}
