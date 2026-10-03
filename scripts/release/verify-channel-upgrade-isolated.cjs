// 完整旧 schema + 合成历史数据升级；仅允许本机专用库，不读取项目环境文件。
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs')
const { createHash } = require('node:crypto')
const path = require('node:path')
const root = path.resolve(__dirname, '../..')
const output = path.join(root, 'artifacts/channel-intake-20260930')
const baselinePath = path.join(output, 'schema-before.sql')
const migrationPath = path.join(root, 'apps/server/prisma/migrations/20260930090000_app_distribution_and_operations/migration.sql')
const psql = 'C:/Program Files/PostgreSQL/16/bin/psql.exe'
const baseline = readFileSync(baselinePath, 'utf8')
const migration = readFileSync(migrationPath, 'utf8')
const names = ['channel_intake_synthetic', 'channel_intake_conflict', 'channel_intake_null_conflict']
mkdirSync(output, { recursive: true })
function sql(db, text) {
  assert.ok(names.includes(db), '只允许本专项三个隔离库')
  return spawnSync(psql, ['-X', '-h', '127.0.0.1', '-p', '55453', '-U', 'channel_intake_test', '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt'], { input: text, encoding: 'utf8', cwd: root })
}
function ok(db, text) {
  const result = sql(db, text)
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}
const evidence = { verifiedAt: new Date().toISOString(), syntheticOnly: true, sourceHead: spawnSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).stdout.trim(), baselineSource: 'de6cd187c3cccb8af2518a420c8a08bfc2b3d599', migrationSha256: createHash('sha256').update(migration).digest('hex'), cases: [] }
function record(name) { evidence.cases.push(name); console.log('通过：' + name) }
try {
  for (const db of names) {
    assert.equal(ok(db, "SELECT current_database() || ':' || current_user || ':' || inet_server_port()"), db + ':channel_intake_test:55453')
    // 只重置上面已核验身份的专用合成库；不触碰共享库。
    ok(db, 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
    ok(db, baseline)
  }
  const historical = `INSERT INTO "AppVersion" ("id","platform","version","buildNumber","status","activePlatformKey","downloadUrl","updatedAt") VALUES ('old-active','android','1.0.0','100','ACTIVE','android','https://example.test/old.apk',CURRENT_TIMESTAMP);
    INSERT INTO "FeatureFlag" ("id","key","name","enabled","percentage","targetUserIds","updatedAt") VALUES ('old-flag','shop_checkout','历史开关',true,37,ARRAY['old-user'],CURRENT_TIMESTAMP);
    INSERT INTO "ConfigVersion" ("id","configKey","value","version","changedBy","comment") VALUES ('old-audit','old-business','{"retained":true}',1,'synthetic-admin','旧审计保留');`
  const main = names[0]
  ok(main, historical)
  const oldFlags = ok(main, 'SELECT "key", "enabled", "percentage", "targetUserIds" FROM "FeatureFlag" ORDER BY "id";')
  const oldAudit = ok(main, 'SELECT row_to_json(v) FROM "ConfigVersion" v ORDER BY "id";')
  ok(main, migration)
  assert.equal(ok(main, `SELECT "activePlatformKey" || ':' || "applicationId" || ':' || "channelId" FROM "AppVersion" WHERE id='old-active'`), 'rebu:android:legacy:rebu:legacy')
  assert.equal(ok(main, 'SELECT "key", "enabled", "percentage", "targetUserIds" FROM "FeatureFlag" ORDER BY "id";'), oldFlags)
  assert.equal(ok(main, 'SELECT row_to_json(v) FROM "ConfigVersion" v ORDER BY "id";'), oldAudit)
  assert.equal(ok(main, 'SELECT COUNT(*) FROM "AppDistribution" WHERE "wgtPolicy"=\'DENIED\';'), '3')
  record('完整旧 schema 升级保留历史活动版本、灰度用户、开关与审计；三个兼容渠道默认禁用 WGT')
  for (const [index, build] of [[1, "'100'"], [2, 'NULL']]) {
    const db = names[index]
    ok(db, `INSERT INTO "AppVersion" (id,platform,version,"buildNumber","updatedAt") VALUES ('duplicate-1','android','1.0.0',${build},CURRENT_TIMESTAMP),('duplicate-2','android','1.0.0',${build},CURRENT_TIMESTAMP);`)
    const before = ok(db, 'SELECT row_to_json(v) FROM "AppVersion" v ORDER BY id;')
    const result = sql(db, migration)
    assert.notEqual(result.status, 0, '重复历史版本必须明确拒绝升级，包括空构建号')
    assert.match(result.stderr, /unique|重复|23505/i)
    assert.equal(ok(db, 'SELECT row_to_json(v) FROM "AppVersion" v ORDER BY id;'), before, '失败迁移不能残留新增列或变更旧记录')
    assert.equal(ok(db, 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\'public\' AND table_name IN (\'AppDistribution\',\'ResourceRelease\');'), '0')
    record(index === 1 ? '已有重复构建号拒绝升级并完整回滚' : '空构建号重复同样拒绝升级并完整回滚')
  }
  evidence.passed = true
  evidence.limits = ['本机 PostgreSQL16.13，非目标18.4', '旧 schema 来自接收线，数据为合成；不是生产127条迁移或停写备份演练', '不执行生产迁移、不真实版本发布或资源分发']
} catch (error) { evidence.passed = false; evidence.failure = error.message; throw error }
finally { writeFileSync(path.join(output, 'full-schema-upgrade.json'), JSON.stringify(evidence, null, 2)) }
