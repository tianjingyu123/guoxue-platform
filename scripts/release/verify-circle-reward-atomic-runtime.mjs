import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// 候选源码在官方Linux runner中独立构建，临时数据库不开放主机端口。
assert.equal(process.platform, 'linux');
const sourceCommit = process.env.SOURCE_COMMIT;
assert.match(sourceCommit ?? '', /^[a-f0-9]{40}$/);
const candidate = path.resolve('candidate');
const nodeImage = 'node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d';
const postgresImage = 'pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff';
const redisImage = 'redis:7-alpine@sha256:e7723ff73d963f5cc6d9c4643ea3d989527a402a319239054e9472a7fb9219a2';
const suffix = randomBytes(5).toString('hex');
const runtimeImage = `rebu-reward-runtime:${suffix}`;
const network = `rebu-reward-${suffix}`, database = `rebu-reward-db-${suffix}`, cache = `rebu-reward-redis-${suffix}`;
const temp = mkdtempSync(path.join(os.tmpdir(), 'rebu-reward-'));
const password = randomBytes(24).toString('hex');
const databaseUrl = `postgresql://guoxue:${password}@${database}:5432/guoxue`;
const sanitize = text => [password, databaseUrl].reduce((safe, secret) => safe.split(secret).join('[已隐藏]'), String(text));
for (const secret of [password, databaseUrl]) console.log(`::add-mask::${secret}`);
const results = path.resolve('results'); mkdirSync(results, { recursive: true });
const report = { sourceCommit, passed: false, productionDeployment: false, productionDatabaseTouched: false, realNotifications: 0, checks: [], nodeImage, postgresImage, redisImage, formalDockerfileImageTested: false, schemaScope: 'candidate-schema-temporary-empty-database', targetObservedPostgres: '18.4', targetPatchMatch: false };
const runDocker = (args, input) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
const docker = (args, input) => {
  const run = runDocker(args, input);
  assert.equal(run.status, 0, sanitize(run.stderr || run.stdout || run.error?.message || 'Docker验证失败'));
  return sanitize(run.stdout || '');
};
try {
  const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: candidate, encoding: 'utf8' });
  assert.equal(gitHead.status, 0); assert.equal(gitHead.stdout.trim(), sourceCommit);
  const gitDiff = spawnSync('git', ['diff', '--exit-code', 'HEAD', '--', 'apps/server/src', 'apps/server/prisma', 'packages', 'package.json', 'pnpm-lock.yaml'], { cwd: candidate });
  assert.equal(gitDiff.status, 0, '构建不能混入未提交业务源码');
  report.sourceFiles = Object.fromEntries([
    'apps/server/src/modules/circle/services/circle-post.service.ts',
    'apps/server/src/modules/coin/coin.service.ts',
    'apps/server/prisma/schema.prisma', 'pnpm-lock.yaml',
  ].map(file => [file, createHash('sha256').update(readFileSync(path.join(candidate, file))).digest('hex')]));
  report.compiledFiles = Object.fromEntries([
    'apps/server/dist/modules/circle/services/circle-post.service.js',
    'apps/server/dist/modules/coin/coin.service.js',
  ].map(file => [file, createHash('sha256').update(readFileSync(path.join(candidate, file))).digest('hex')]));
  for (const image of [nodeImage, postgresImage, redisImage]) docker(['pull', image]);
  // 与正式运行阶段同样安装SSL依赖；这是验证容器，不冒充正式Dockerfile成品镜像。
  docker(['build', '--tag', runtimeImage, '--file', '-', temp], `FROM ${nodeImage}\nRUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*\n`);
  report.opensslVersion = docker(['run', '--rm', '--entrypoint', 'openssl', runtimeImage, 'version']).trim();
  assert.match(report.opensslVersion, /^OpenSSL 3\./);
  docker(['network', 'create', '--internal', network]);
  const dbEnv = path.join(temp, 'database.env'), appEnv = path.join(temp, 'application.env');
  writeFileSync(dbEnv, `POSTGRES_USER=guoxue\nPOSTGRES_DB=guoxue\nPOSTGRES_PASSWORD=${password}\n`, { mode: 0o600 });
  writeFileSync(appEnv, `NODE_ENV=test\nDATABASE_URL=${databaseUrl}\nREDIS_URL=redis://${cache}:6379/0\nSOURCE_COMMIT=${sourceCommit}\nRUN_DB_MIGRATIONS=false\nBULLMQ_DISABLED=true\n`, { mode: 0o600 });
  docker(['run', '-d', '--name', database, '--network', network, '--env-file', dbEnv, postgresImage]);
  docker(['run', '-d', '--name', cache, '--network', network, redisImage]);
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const probe = runDocker(['exec', database, 'pg_isready', '-U', 'guoxue', '-d', 'guoxue']);
    if (probe.status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, '临时数据库启动超时');
  assert.equal(docker(['exec', cache, 'redis-cli', 'ping']).trim(), 'PONG');
  report.postgresVersion = docker(['exec', database, 'psql', '-U', 'guoxue', '-d', 'guoxue', '-Atc', 'SHOW server_version']).trim();
  report.redisVersion = docker(['exec', cache, 'redis-cli', 'INFO', 'server']).split('\n').find(line => line.startsWith('redis_version:'))?.trim();
  const baseArgs = ['run', '--rm', '--network', network, '--env-file', appEnv, '--mount', `type=bind,source=${candidate},target=/app,readonly`, '--mount', `type=bind,source=${process.cwd()},target=/verification,readonly`, '--workdir', '/app/apps/server', '--entrypoint', 'node', runtimeImage];
  const req = createRequire(path.join(candidate, 'apps/server/package.json'));
  const prismaCli = '/app/' + path.relative(candidate, req.resolve('prisma/build/index.js'));
  const schema = docker([...baseArgs, prismaCli, 'db', 'push', '--skip-generate']);
  writeFileSync(path.join(results, 'reward-temporary-schema.log'), schema);
  const output = docker([...baseArgs, '/verification/scripts/release/verify-circle-reward-atomic.cjs']);
  writeFileSync(path.join(results, 'circle-reward-atomic-runtime.log'), output);
  const result = JSON.parse(output.trim().split('\n').findLast(line => line.startsWith('NODE_TEST_RESULT:'))?.slice(17) || 'null');
  assert(result?.passed, '打赏原子事务真实验证失败'); assert.equal(result.sourceCommit, sourceCommit); assert.equal(result.checks.length, 14);
  Object.assign(report, result);
} catch (error) { report.error = sanitize(error.message); console.error(report.error); process.exitCode = 1; }
finally {
  runDocker(['rm', '-f', database, cache]); runDocker(['network', 'rm', network]); runDocker(['image', 'rm', runtimeImage]);
  report.cleanup = { databaseAbsent: runDocker(['inspect', database]).status === 1, redisAbsent: runDocker(['inspect', cache]).status === 1, networkAbsent: runDocker(['network', 'inspect', network]).status === 1, verificationImageAbsent: runDocker(['image', 'inspect', runtimeImage]).status === 1 };
  report.temporaryResourcesReleased = Object.values(report.cleanup).every(Boolean);
  if (!report.temporaryResourcesReleased) { process.exitCode = 1; report.passed = false; }
  rmSync(temp, { recursive: true, force: true });
  writeFileSync(path.join(results, 'circle-reward-atomic-runtime.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ sourceCommit, passed: report.passed, completedChecks: report.checks.length, temporaryResourcesReleased: report.temporaryResourcesReleased }));
}
