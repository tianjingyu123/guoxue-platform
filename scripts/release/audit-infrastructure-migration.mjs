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
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function hasAll(source, snippets) {
  return snippets.every((snippet) => source.includes(snippet));
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
  "docker/setup-server.sh",
  "docker/deploy.sh",
  "scripts/release/activate-fixed-release.sh",
  "scripts/release/rollback-fixed-release.sh",
  "scripts/release/preflight-host.sh",
  "scripts/release/validate-release-layout.sh",
  "scripts/release/verify-production-cutover.sh",
  "scripts/release/current-compose.sh",
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
      "库存流水前后余额不守恒",
      "经营中商家缺少上线必需资质",
      "已审核文章缺少首图",
      "pg_get_serial_sequence",
      "current_value < maximum_value",
    ]),
  "迁移不仅核对表行数，还必须阻止失效约束、负库存、账实不符、缺资质商家、缺图文章和序列倒退上线",
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
    'PGDATABASE="$database_url" pg_dump',
    'source_mode="managed-database-url"',
    "printf '%s\\n' \"$database_url\" | docker exec -i",
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

const setupServer = read("docker/setup-server.sh");
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
    "COMPOSE+=( -f docker-compose.tencent.yml )",
    'if [ "$DEPLOY_TARGET" = "standard" ]; then',
    "Environment=DEPLOY_TARGET=$DEPLOY_TARGET",
    '"${COMPOSE[@]}" up -d --build postgres redis',
    "托管架构：不启动本地 PostgreSQL / Redis",
  ]),
  "托管架构不得因显式点名 profile 服务而误启动本地空 PostgreSQL/Redis",
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
    "MIN_NODE_VERSION",
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
    "node_20.x",
    "postgresql-client-${POSTGRES_CLIENT_MAJOR}",
    "nodejs:20",
    '"postgresql:${POSTGRES_CLIENT_MAJOR}"',
    "宿主机运行时: Node.js",
  ]),
  "初始化必须安装 Node.js 20 和与目标主版本一致的 PostgreSQL 客户端，避免迁移中途才暴露缺失命令",
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
    'mode: 0o600',
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
    "docker image prune -f",
    "docker builder prune -f --filter 'until=168h'",
    "禁止 system prune -a 删除旧版回滚镜像",
  ]) &&
    !setupServer.includes("docker system prune -af") &&
    hasAll(productionBackup, [
      'BACKUP_LOCK_FILE="${BACKUP_LOCK_FILE:-$BACKUP_DIR/.backup.lock}"',
      'flock -n 9',
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
    "服务已响应，但运行版本不一致",
    "服务存活且运行版本一致",
    "自动回滚",
  ]),
  "存活检查必须同时返回本次固定包的发布标识；仍在响应的旧容器不能让部署任务误报成功",
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
    "runs-on: ubuntu-latest",
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
      "九份证据一致且有效时给出 GO",
      "主机预检未通过时阻断上线",
      "新基础设施接入未达到 launch 阶段时阻断上线",
      "数据库核验不是 final 模式时阻断上线",
      "Prisma 迁移状态未通过时阻断上线",
      "客户端配置指纹不一致时阻断上线",
      "运行实例版本不一致时阻断上线",
      "现场环境证据过期时阻断上线",
      "固定包验真允许 dirty 时阻断上线",
      "版本保留审计执行破坏性操作时阻断上线",
      "任一来源证据缺失时阻断上线",
    ]) &&
    releasePackageJson.includes("pnpm release:test-evidence") &&
    releasePackageJson.includes('"release:aggregate-evidence"'),
  "主机预检、新基础设施接入、包、已部署目录、客户端配置绑定、数据库迁移对账、完整环境、公网运行时和版本保留证据必须同版、有效且不可降级，并记录来源哈希供签字复盘",
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
      "机器九证据与双负责人九项验收完整时给出最终 GO",
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
  "GitHub 生产发布绑定默认分支、源提交与迁移二次确认",
  hasAll(deploymentWorkflow, [
    "workflow_dispatch:",
    "production_confirmation:",
    "migration_confirmation:",
    "PRODUCTION_DEPLOY_READY",
    "PRODUCTION_DEPLOY_TARGET",
    "PROD_SSH_FINGERPRINT_CONFIGURED",
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
      "PROD_SSH_FINGERPRINT",
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
      "PROD_SSH_FINGERPRINT",
    ]) &&
    (productionDeployJob.match(/fingerprint:\s*\$\{\{ secrets\.PROD_SSH_FINGERPRINT \}\}/g)
      ?.length ?? 0) === 3 &&
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
  "公网切流后可独立重跑九证据并机器判定 GO",
  hasAll(productionVerificationWorkflow, [
    "workflow_dispatch:",
    "production_confirmation:",
    "PRODUCTION_DEPLOY_READY",
    "PRODUCTION_DEPLOY_TARGET",
    "PROD_SSH_FINGERPRINT_CONFIGURED",
    "permissions:",
    "contents: read",
    "validate-production-dispatch.mjs",
    "SOURCE_REF: ${{ github.ref }}",
    "SOURCE_SHA: ${{ github.sha }}",
    "DEFAULT_BRANCH: ${{ github.event.repository.default_branch }}",
    "fingerprint: ${{ secrets.PROD_SSH_FINGERPRINT }}",
    "export PLATFORM_ROOT=/opt/guoxue",
    "export RELEASE_ID='${{ inputs.release_id }}'",
    "export MAX_AGE_HOURS='${{ inputs.max_age_hours }}'",
    "export DEPLOY_TARGET='${{ vars.PRODUCTION_DEPLOY_TARGET }}'",
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
    "audit-host-preflight.mjs",
    "host-preflight-readiness.json",
    '--expected-commit "$SOURCE_COMMIT"',
    "check-env.mjs",
    "verify-runtime.mjs",
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
  "正式环境必须与新数据库、缓存、域名和对象存储接入清单逐项绑定",
  hasAll(infrastructureIntakeTemplate, ['"endpointHost"', '"bucket"', '"region"']) &&
    hasAll(infrastructureIntakeAudit, [
      'valueOf("--env-file")',
      'environmentValues.get("DATABASE_URL")',
      'environmentValues.get("REDIS_URL")',
      'environmentValues.get("PUBLIC_API_URL")',
      'environmentValues.get("COS_BUCKET")',
      'environmentValues.get("COS_REGION")',
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
    setupServer.includes(
      'node -- "$INSTALL_DIR/scripts/release/audit-host-preflight.mjs"',
    ) &&
    hasAll(read("docs/operations/新基础设施与正式凭据交接清单-20260731.md"), [
      "node -- /opt/guoxue/current/scripts/release/audit-infrastructure-intake.mjs",
      "node -- /opt/guoxue/current/scripts/release/audit-host-preflight.mjs",
    ]) &&
    read("tests/release/audit-infrastructure-intake.test.mjs").includes(
      "正式环境连接到另一套数据库或对象存储时阻断且报告不泄露地址与凭据",
    ),
  "两份各自合法但指向不同资源的配置必须在预部署和公网复核阶段被机器阻断，报告不得落原始地址或凭据",
);
add(
  "新基础设施移交总览区分已验收资源与最终上线阻断",
  hasAll(infrastructureHandoff, [
    "当前不能标记为正式上线",
    "已配置并演练",
    "预发布已通；长期证书/合规待办",
    "待冻结/待复核",
    "launch-decision.json",
    "生产包必须由干净工作树生成",
    "禁止在切流后用旧库覆盖新库",
  ]) &&
    !infrastructureHandoff.includes(
      "由于新服务器、新 PostgreSQL、新 Redis、新域名、正式证书和正式凭据尚未交接",
    ),
  "已完成资源必须记录实测证据，未完成的固定发布、支付、迁移、合规与签核仍须保持阻断；历史环境只能作为迁移源或回滚保留环境",
);

const environmentChecker = read("scripts/migration/check-env.mjs");
add(
  "正式凭据验收可审计且不泄露密钥",
  hasAll(environmentChecker, [
    'arg === "--report"',
    'arg === "--deploy-target"',
    "完整上线检查必须通过 --deploy-target 显式指定",
    "configuredKeys: values.size",
    "success: errors.length === 0",
    "不含任何配置值",
    "mode: 0o600",
    '"MINIPROGRAM_APP_SECRET"',
    'errors.push("尚未形成一条完整支付通道',
    "DEPLOY_TARGET=tencent 时必须使用已验收的托管服务私网地址",
    "DEPLOY_TARGET=tencent 时 STORAGE_PROVIDER 必须为 cos",
  ]) && !environmentChecker.includes("Object.fromEntries(values)"),
  "完整上线必须至少具备一条支付通道，小程序密钥别名要与服务端一致，验收报告只能记录字段名级错误和计数",
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
const sourceFreezeAudit = read("scripts/release/audit-source-freeze.mjs");
const sourceFreezeTest = read("tests/release/audit-source-freeze.test.mjs");
const fullGateTest = read("tests/release/run-full-gate.test.mjs");
const pnpmInvocationResolver = read("scripts/release/resolve-pnpm-invocation.mjs");
const pnpmInvocationTest = read("tests/release/resolve-pnpm-invocation.test.mjs");
const packageJson = read("package.json");
const fullGateRunner = read("scripts/release/run-full-gate.mjs");
const productionDeployWorkflow = read(".github/workflows/deploy.yml");
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
      'spawnSync("tar", ["-tzf", archiveName]',
      'spawnSync("tar", ["-tvzf", archiveName]',
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
add(
  "本地验收材料不会混入源码基线或容器构建上下文",
  gitIgnore.split(/\r?\n/u).includes("/artifacts/") &&
    dockerIgnore.split(/\r?\n/u).includes("artifacts") &&
    gitIgnore.split(/\r?\n/u).includes("config/release/infrastructure-intake.json") &&
    dockerIgnore.split(/\r?\n/u).includes("config/release/infrastructure-intake.json"),
  "构建包、截图、旧包审计副本与迁移演练证据保留在本机 artifacts/，但必须同时从 Git 和 Docker 上下文排除",
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
      "禁止静默使用仓库内历史环境文件",
      '"release:verify:local"',
      '"release:build:clients"',
      '"release:audit-client-artifacts"',
      '"environment-readiness.json"',
      '"infrastructure-intake-readiness.json"',
      '"client-artifact-audit.json"',
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
for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}：${item.detail}`);
}

const failed = checks.filter((item) => !item.pass);
console.log(`\n结果：${checks.length - failed.length}/${checks.length} 通过`);
if (failed.length > 0) {
  process.exitCode = 1;
}
