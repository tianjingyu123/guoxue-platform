// 仅用于独立 Linux 临时空库，不进入正式包，也不接受生产连接。
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = process.cwd(), out = path.join(root, 'artifacts/tenant-bootstrap-isolated');
const source = '07e81fe51a2aa693e78b4714f200c91790420e1e';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (...args) => cp.execFileSync('git', args, { encoding: 'utf8' }).trim();
const url = new URL(process.env.DATABASE_URL);
assert.equal(process.env.EXPECTED_BUSINESS_SOURCE, source);
assert.equal(url.hostname, '127.0.0.1');assert.equal(url.port, '5432');
assert.equal(url.pathname, '/tenant_bootstrap_isolated');assert.equal(url.username, 'guoxue_test');
const allowed = ['.github/workflows/tenant-bootstrap-isolated.yml', 'tests/release/tenant-bootstrap-runtime.cjs'];
const changed = git('diff', '--name-only', source, 'HEAD').split('\n').filter(Boolean);
assert.deepEqual(changed.sort(), allowed.sort(), '验证分支不得修改候选运行源码');
const { PrismaClient } = require(path.join(root, 'apps/server/node_modules/@prisma/client'));
const prisma = new PrismaClient();fs.mkdirSync(out, { recursive: true });
const report = { sourceCommit: source, verificationCommit: git('rev-parse', 'HEAD'), checkedAt: new Date().toISOString(), production: false, production103Upgrade: false, candidateSchemaMigrations: 144 };
async function main() {
  assert.equal(await prisma.$queryRawUnsafe('SELECT current_database() AS db').then(rows => rows[0].db), 'tenant_bootstrap_isolated');
  const before = await prisma.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  assert.equal(before.length, 0, '必须是本任务服务容器的新空库');
  const script = 'apps/server/prisma/migrations-deploy/bootstrap-empty-database.sh';
  const run = cp.spawnSync('bash', [script], { cwd: root, env: { ...process.env, CONFIRM_EMPTY_DATABASE: 'YES' }, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, 'bootstrap.log'), (run.stdout || '') + '\n' + (run.stderr || ''));
  assert.equal(run.status, 0, '真实完整初始化必须成功');
  const migrations = path.join(root, 'apps/server/prisma/migrations');
  const ledger = await prisma.$queryRawUnsafe('SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
  const names = fs.readdirSync(migrations).filter(name => fs.existsSync(path.join(migrations, name, 'migration.sql'))).sort();
  // 数据库排序规则与 JS 字符排序可能不同；账本成员按同一排序比较，校验值逐行核验。
  assert.equal(names.length, 144);assert.deepEqual(ledger.map(row => row.migration_name).sort(), names);
  for (const row of ledger) assert.equal(row.checksum, hash(fs.readFileSync(path.join(migrations, row.migration_name, 'migration.sql'))));
  const models = [...fs.readFileSync(path.join(root, 'apps/server/prisma/migrations-deploy/full-baseline.sql'), 'utf8').matchAll(/CREATE TABLE "([^"]+)"/g)].map(match => match[1]);
  assert.equal(models.length, 414);
  const tables = await prisma.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'");
  for (const name of models) assert(tables.some(row => row.table_name === name));
  const expectedChecks = ['ManagedBrandRequest_order_shape', 'ManagedLeaseWriteFence_epoch_check', 'ManagedLeaseWriteFence_state_check'];
  const checks = await prisma.$queryRawUnsafe("SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace AND conname LIKE 'Managed%' ORDER BY conname");
  assert.deepEqual(checks.map(row => row.conname), expectedChecks);
  const vector = await prisma.$queryRawUnsafe("SELECT extversion FROM pg_extension WHERE extname='vector'");assert.equal(vector.length, 1);
  const diff = cp.spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'diff', '--from-url', process.env.DATABASE_URL, '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'], { cwd: path.join(root, 'apps/server'), encoding: 'utf8', timeout: 120000 });
  fs.writeFileSync(path.join(out, 'schema-diff.log'), (diff.stdout || '') + '\n' + (diff.stderr || ''));
  assert.equal(diff.status, 0, '初始化后的 schema 不能漂移');
  const rejected = cp.spawnSync('bash', [script], { cwd: root, env: { ...process.env, CONFIRM_EMPTY_DATABASE: 'YES' }, encoding: 'utf8', timeout: 30000 });
  fs.writeFileSync(path.join(out, 'nonempty-rejection.log'), (rejected.stdout || '') + '\n' + (rejected.stderr || ''));
  assert.equal(rejected.status, 65, '同一非空库不能被再次初始化');
  assert.deepEqual(await prisma.$queryRawUnsafe('SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name'), ledger);
  Object.assign(report, { passed: true, actualRepositoryScript: true, models: 414, ledgerEntries: ledger.length, rawMigrationChecksumsMatch: true, checks, vectorVersion: vector[0].extversion, schemaDiffExit: 0, nonemptyRejected: true, sourceSha256: hash(fs.readFileSync(path.join(root, script))), schemaSha256: hash(fs.readFileSync(path.join(root, 'apps/server/prisma/schema.prisma'))) });
}
main().catch(error => { report.passed = false; report.failure = error.message; process.exitCode = 1; }).finally(async () => {
  await prisma.$disconnect();fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ sourceCommit: source, passed: report.passed, models: report.models, ledger: report.ledgerEntries, production: false }));
});
