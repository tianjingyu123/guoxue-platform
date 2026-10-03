import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadCandidatePrisma } from '../../scripts/ops/prisma-candidate/client.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(repo, 'apps/server/package.json'));
const runtime = resolve(repo, 'pilots/managed-tenancy/.runtime');
const credentials = JSON.parse(readFileSync(resolve(runtime, 'postgres/synthetic-connections.json'), 'utf8'));
const { PrismaClient } = loadCandidatePrisma();
const checks = [], results = {};
let failure;
try {
  for (const database of ['mt_control', 'mt_customer_a', 'mt_customer_b']) {
    const url = `postgresql://${database}:${credentials[database]}@127.0.0.1:55467/${database}`;
    const db = new PrismaClient({ datasources: { db: { url } } });
    let snapshotConstraint;
    try {
      const identity = await db.$queryRawUnsafe('SELECT current_database() db,current_user actor,inet_server_port() port');
      assert.deepEqual(identity[0], { db: database, actor: database, port: 55467 });
      const constraints = await db.$queryRawUnsafe(`SELECT convalidated,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='"CirclePostRewardNotice"'::regclass AND conname='CirclePostRewardNotice_source_snapshot_shape' AND contype='c'`);
      assert.equal(constraints.length, 1, '公共成交快照CHECK缺失或类型不符');
      snapshotConstraint = constraints[0];
      assert.equal(snapshotConstraint.convalidated, true, '公共成交快照CHECK未验证');
      for (const field of ['sourceVersion','sourcePostId','sourceCircleId','sourceRecipientId']) {
        assert.ok(snapshotConstraint.definition.includes(`"${field}" IS NULL`));
        assert.ok(snapshotConstraint.definition.includes(`"${field}" IS NOT NULL`));
      }
      assert.ok(snapshotConstraint.definition.includes("'POST_REWARD_LOCKED_V1'"));
      // PG16规范化输出与已审阅接收迁移一致；防止保留字段词却追加OR TRUE。
      assert.equal(createHash('sha256').update(snapshotConstraint.definition).digest('hex'), 'd97551116e67fcf6cfccb0b8a9d583f86d004f06730cd2e9e06419e79e48aed3', '公共成交快照CHECK定义与固定接收点不一致');
    } finally { await db.$disconnect(); }
    const cli = args => spawnSync(process.execPath, [resolve(require.resolve('prisma/package.json'), '../build/index.js'), ...args], { cwd: repo, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    const validation = cli(['validate', '--schema', 'apps/server/prisma/schema.prisma']);
    if (validation.status !== 0) writeFileSync(resolve(runtime, 'schema-cli.log'), (validation.stdout || '') + (validation.stderr || ''));
    assert.equal(validation.status, 0, '候选schema语法验证失败');
    const diff = cli(['migrate', 'diff', '--from-schema-datasource', 'apps/server/prisma/schema.prisma', '--to-schema-datamodel', 'apps/server/prisma/schema.prisma', '--script']);
    if (diff.status !== 0) writeFileSync(resolve(runtime, 'schema-cli.log'), (diff.stdout || '') + (diff.stderr || ''));
    assert.equal(diff.status, 0, '只读结构比较失败');
    writeFileSync(resolve(runtime, `${database}-schema-diff.sql`), diff.stdout);
    // 仅检查，不运行返回的SQL；既有基线差异不能混入本专项迁移。
    const statements = diff.stdout.replace(/^--.*$/gm, '').trim();
    assert.ok(!/"Managed(?:Customer|Deployment|Application|Grant|Membership|Audit|LeaseAftercare|LeaseExport|LeaseExportPage|LeaseAudit|LeaseIdentity|LeaseRefresh|LeaseLoginThrottle|BrandOrder|BrandRequest)"/.test(statements), '本专项新增结构与实际数据库不一致');
    results[database] = { managedTablesMatch: true, fullSchemaMatches: statements.length === 0, snapshotCheckValidated: true, snapshotCheckSha256: createHash('sha256').update(snapshotConstraint.definition).digest('hex'), diffSha256: createHash('sha256').update(diff.stdout).digest('hex') };
    checks.push({ name: `${database}身份、schema语法与本专项十五张表结构一致性`, status: 'PASS' });
  }
} catch (error) { failure = true; writeFileSync(resolve(runtime, 'schema-diagnostic.txt'), error.stack || String(error), { mode: 0o600 }); }
const files = ['apps/server/prisma/schema.prisma', 'apps/server/prisma/migrations-deploy/full-baseline.sql', 'apps/server/prisma/migrations-deploy/circle-reward-snapshot.sql', 'apps/server/prisma/migrations/manual_z_20261002_07_circle_post_reward_notice_snapshot/migration.sql', ...['07_managed_customer_control', '08_managed_lease_exit', '09_managed_brand_order', '10_managed_lease_identity', '11_managed_recovery_export'].map(name => `apps/server/prisma/migrations/manual_z_20261002_${name}/migration.sql`)];
const report = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), sources: Object.fromEntries(files.map(path => [path, createHash('sha256').update(readFileSync(resolve(repo, path))).digest('hex')])), node: process.version, checks, results, passed: checks.length, failed: failure ? 1 : 0, production: false, limits: ['只读比较本任务三个合成库；未执行修正SQL或生产迁移', '完整基线如有既有差异，单独记录，不混入本专项迁移'] };
const output = resolve(process.argv[2] || resolve(runtime, 'schema-postgres.json'));
mkdirSync(resolve(output, '..'), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, results, report: output }));
if (failure) process.exitCode = 1;
