import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 只启动封闭临时空库，验证正式镜像中两处通知事实修复；不启动 HTTP 主入口或真实渠道。
const sourceCommit = 'b6d1f59cf0dc3c0ee0d8b8609726f5aec4d7297b';
const sourceSha256 = 'c666741a8da449ea610af565954d03979f8829f69986904a4911bf81e55ce047';
const image = 'rebu-linux-verify:b6d1f59c';
assert.equal(process.env.IMAGE_TAG, image);
const postgresImage = 'pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff';
const suffix = randomBytes(5).toString('hex');
const network = `rebu-circle-facts-${suffix}`, database = `rebu-circle-db-${suffix}`;
const temp = mkdtempSync(path.join(os.tmpdir(), 'rebu-circle-facts-'));
const password = randomBytes(24).toString('hex');
const databaseUrl = `postgresql://guoxue:${password}@${database}:5432/guoxue`;
const sanitize = text => [password, databaseUrl].reduce((safe, secret) => safe.split(secret).join('[已隐藏]'), String(text));
for (const secret of [password, databaseUrl]) console.log(`::add-mask::${secret}`);
const results = path.resolve('results'); mkdirSync(results, { recursive: true });
const report = { sourceCommit, sourceSha256, image, postgresImage, passed: false, productionDeployment: false, productionDatabaseTouched: false, realNotifications: 0, checks: [] };
const docker = (args, allowFailure = false) => {
  const run = spawnSync('docker', args, { encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
  if (!allowFailure) assert.equal(run.status, 0, sanitize(run.stderr || run.stdout || run.error?.message || 'Docker 验证失败'));
  return sanitize(run.stdout || '');
};
try {
  const identity = JSON.parse(docker(['image', 'inspect', image]))[0];
  assert.equal(identity.Config.Labels['org.opencontainers.image.revision'], sourceCommit);
  assert.equal(identity.Config.Labels['rebu.source-archive.sha256'], sourceSha256);
  report.imageId = identity.Id;
  docker(['pull', postgresImage]); docker(['network', 'create', '--internal', network]);
  const dbEnv = path.join(temp, 'database.env'), appEnv = path.join(temp, 'application.env');
  writeFileSync(dbEnv, `POSTGRES_USER=guoxue\nPOSTGRES_DB=guoxue\nPOSTGRES_PASSWORD=${password}\n`, { mode: 0o600 });
  writeFileSync(appEnv, `NODE_ENV=test\nDATABASE_URL=${databaseUrl}\nRUN_DB_MIGRATIONS=false\nBULLMQ_DISABLED=true\n`, { mode: 0o600 });
  docker(['run', '-d', '--name', database, '--network', network, '--env-file', dbEnv, postgresImage]);
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const probe = spawnSync('docker', ['exec', database, 'pg_isready', '-U', 'guoxue', '-d', 'guoxue'], { stdio: 'ignore', timeout: 10000 });
    if (probe.status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  assert(ready, '临时数据库启动超时');
  report.postgresVersion = docker(['exec', database, 'psql', '-U', 'guoxue', '-d', 'guoxue', '-Atc', 'SHOW server_version']).trim();
  report.targetObservedVersion = '18.4'; report.targetPatchMatch = false;
  const schema = docker(['run', '--rm', '--network', network, '--env-file', appEnv, '--entrypoint', 'pnpm', image, '--dir', '/app/apps/server', 'exec', 'prisma', 'db', 'push', '--skip-generate']);
  writeFileSync(path.join(results, 'circle-temporary-schema.log'), schema);
  report.schemaScope = 'final-schema-in-temporary-empty-database-not-production-upgrade';
  const fixture = readFileSync(new URL('./verify-circle-notification-facts.cjs', import.meta.url), 'utf8');
  const output = docker(['run', '--rm', '--network', network, '--env-file', appEnv, '--entrypoint', 'node', image, '-e', fixture]);
  writeFileSync(path.join(results, 'circle-notification-facts-runtime.log'), output);
  const result = JSON.parse(output.trim().split('\n').findLast(line => line.startsWith('NODE_TEST_RESULT:'))?.slice(17) || 'null');
  assert(result?.passed, '真实数据库定向验证失败'); assert.equal(result.checks.length, 10);
  Object.assign(report, result);
} catch (error) { report.error = sanitize(error.message); console.error(report.error); process.exitCode = 1; }
finally {
  docker(['rm', '-f', database], true); docker(['network', 'rm', network], true);
  // 实测资源不存在，不能仅凭清理命令已发出就宣称释放完成。
  report.cleanup = {
    databaseAbsent: spawnSync('docker', ['inspect', database], { stdio: 'ignore', timeout: 10000 }).status === 1,
    networkAbsent: spawnSync('docker', ['network', 'inspect', network], { stdio: 'ignore', timeout: 10000 }).status === 1,
  };
  report.temporaryResourcesReleased = Object.values(report.cleanup).every(Boolean);
  if (!report.temporaryResourcesReleased) { report.passed = false; process.exitCode = 1; }
  rmSync(temp, { recursive: true, force: true });
  writeFileSync(path.join(results, 'circle-notification-facts-runtime.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ sourceCommit, passed: report.passed, completedChecks: report.checks.length }));
}
