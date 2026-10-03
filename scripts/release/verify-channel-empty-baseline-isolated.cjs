// 仅在本机专项空库比较空库基线与升级路径；不读取项目凭据，不访问生产。
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { readFileSync, writeFileSync } = require('node:fs')
const { createHash } = require('node:crypto')
const path = require('node:path')
const root = path.resolve(__dirname, '../..')
const output = path.join(root, 'artifacts/channel-intake-20260930')
const psql = 'C:/Program Files/PostgreSQL/16/bin/psql.exe'
const empty = 'channel_intake_empty'
const upgraded = 'channel_intake_synthetic'
function sql(db, text) {
  assert.ok([empty, upgraded].includes(db), '只允许专项两个本机库')
  return spawnSync(psql, ['-X', '-h', '127.0.0.1', '-p', '55453', '-U', 'channel_intake_test', '-d', db, '-v', 'ON_ERROR_STOP=1', '-qAt'], { input: text, encoding: 'utf8' })
}
function ok(db, text) { const result = sql(db, text); assert.equal(result.status, 0, result.stderr); return result.stdout.trim() }
const baseline = readFileSync(path.join(root, 'apps/server/prisma/migrations-deploy/full-baseline.sql'), 'utf8')
const supplement = readFileSync(path.join(root, 'apps/server/prisma/migrations-deploy/channel-operations.sql'), 'utf8')
const evidence = { sourceHead: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim(), syntheticOnly: true, checks: [], baselineSha256: createHash('sha256').update(baseline).digest('hex'), supplementSha256: createHash('sha256').update(supplement).digest('hex'), passed: false }
try {
  for (const db of [empty, upgraded]) assert.equal(ok(db, 'SELECT current_database() || \':\' || current_user || \':\' || inet_server_port();'), db + ':channel_intake_test:55453')
  ok(empty, 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  ok(empty, 'BEGIN;\n' + baseline + '\n' + supplement + '\nCOMMIT;')
  evidence.checks.push('完整当前空库基线及渠道补充在单一事务中成功')
  const objects = `SELECT c.conname || ':' || pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE c.conname IN ('AppVersion_rollout_check','FeatureFlag_operationState_check','ResourceRelease_rollout_check','ResourceRelease_version_check') ORDER BY c.conname;`
  const expected = ok(upgraded, objects)
  assert.equal(expected.split('\n').length, 4)
  assert.equal(ok(empty, objects), expected)
  const unique = `SELECT indexdef FROM pg_indexes WHERE indexname='AppVersion_applicationId_platform_channelId_version_buildNu_key';`
  assert.match(ok(upgraded, unique), /NULLS NOT DISTINCT/)
  assert.equal(ok(empty, unique), ok(upgraded, unique))
  const seeds = `SELECT id || ':' || "applicationId" || ':' || platform || ':' || "channelId" || ':' || "clientKey" || ':' || "wgtPolicy" FROM "AppDistribution" ORDER BY id;`
  assert.equal(ok(empty, seeds), ok(upgraded, seeds))
  evidence.checks.push('四项数据库检查约束、空构建号唯一索引及三个禁用WGT兼容槽与升级路径一致')
  const invalid = [
    ['INSERT INTO "FeatureFlag" (id,key,name,"operationState","updatedAt") VALUES (\'invalid\',\'invalid\',\'test\',\'BAD\',CURRENT_TIMESTAMP);', /check|23514|检查/i],
    ['INSERT INTO "AppVersion" (id,platform,version,"rolloutPercentage","updatedAt") VALUES (\'invalid\',\'android\',\'1\',101,CURRENT_TIMESTAMP);', /check|23514|检查/i],
    ['INSERT INTO "AppVersion" (id,platform,version,"targetUserIds","updatedAt") VALUES (\'invalid\',\'android\',\'1\',NULL,CURRENT_TIMESTAMP);', /null|23502|空值/i],
    ['INSERT INTO "ResourceRelease" (id,"applicationId",platform,"channelId","resourceVersion",manifest,signature,"keyId") VALUES (\'invalid\',\'rebu\',\'android\',\'legacy\',0,\'{}\',\'test\',\'test\');', /check|23514|检查/i],
    ['BEGIN; INSERT INTO "AppVersion" (id,platform,version,"updatedAt") VALUES (\'dup-a\',\'android\',\'1\',CURRENT_TIMESTAMP),(\'dup-b\',\'android\',\'1\',CURRENT_TIMESTAMP); COMMIT;', /unique|23505|重复/i],
  ]
  for (const [statement, pattern] of invalid) { const result = sql(empty, statement); assert.notEqual(result.status, 0); assert.match(result.stderr, pattern) }
  assert.equal(ok(empty, 'SELECT COUNT(*) FROM "AppVersion";'), '0')
  evidence.checks.push('非法运营状态、越界灰度、空用户数组、无效资源版本及空构建号重复均拒绝且不残留版本')
  evidence.passed = true
  evidence.limits = ['本机PG16.13及合成数据；非目标18.4、非生产103→128升级', '验证渠道空库路径，不替代旧运维对象/会员DML或完整Linux bootstrap 验收']
} catch (error) { evidence.error = error.message; throw error }
finally { writeFileSync(path.join(output, 'empty-baseline.json'), JSON.stringify(evidence, null, 2)) }
