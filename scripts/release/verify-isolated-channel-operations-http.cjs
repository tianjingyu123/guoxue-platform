// 仅在封闭镜像实验库验证正式初始化和真实 HTTP 权限，不投递外部渠道。
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire('/app/apps/server/package.json');
const { PrismaClient } = req('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  if (process.env.ISOLATED_BOOTSTRAP_CHECK === '1') {
    const ledger = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS complete,
      count(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int AS failed FROM "_prisma_migrations"`);
    // 与本次固定包逐条核对，避免旧版迁移数量导致误判，也不能仅凭总数判断完整。
    const fs = require('node:fs');
    const path = require('node:path');
    const crypto = require('node:crypto');
    const migrationRoot = '/app/apps/server/prisma/migrations';
    const migrations = fs.readdirSync(migrationRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => ({ migration_name: entry.name, checksum: crypto.createHash('sha256')
        .update(fs.readFileSync(path.join(migrationRoot, entry.name, 'migration.sql'))).digest('hex') }));
    assert.equal(migrations.length, 144, '本候选固定包迁移数量不符');
    assert.deepEqual(ledger[0], { total: migrations.length, complete: migrations.length, failed: 0 });
    const snapshotColumns = await prisma.$queryRawUnsafe(`SELECT column_name,is_nullable FROM information_schema.columns WHERE table_name='CirclePostRewardNotice' AND column_name IN ('sourceVersion','sourcePostId','sourceCircleId','sourceRecipientId') ORDER BY column_name`);
    assert.equal(snapshotColumns.length,4);assert(snapshotColumns.every(c=>c.is_nullable==='YES'));
    const snapshotCheck = await prisma.$queryRawUnsafe(`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='CirclePostRewardNotice_source_snapshot_shape'`);
    assert.equal(snapshotCheck.length,1);assert(snapshotCheck[0].definition.includes('POST_REWARD_LOCKED_V1'));
    const orderCheck = await prisma.$queryRawUnsafe(`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='OrderBusinessNotice_shape_check'`);
    assert.equal(orderCheck.length,1);assert(orderCheck[0].definition.includes('ORDER_NOTICE_V1'));
    assert.equal(await prisma.orderBusinessNotice.count(),0,'完整基线不回填历史订单通知');
    const persisted = await prisma.$queryRawUnsafe(`SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
    const byName = rows => rows.sort((a, b) => a.migration_name.localeCompare(b.migration_name));
    assert.deepEqual(byName(persisted), byName(migrations), '迁移名称或 SQL 校验值不符');
    const checks = await prisma.$queryRawUnsafe(`SELECT conname FROM pg_constraint WHERE conname IN
      ('AppVersion_rollout_check','FeatureFlag_operationState_check','ResourceRelease_rollout_check','ResourceRelease_version_check') ORDER BY conname`);
    assert.equal(checks.length, 4);
    const index = await prisma.$queryRawUnsafe(`SELECT indexdef FROM pg_indexes WHERE indexname='AppVersion_applicationId_platform_channelId_version_buildNu_key'`);
    assert.match(index[0].indexdef, /NULLS NOT DISTINCT/);
    const arrays = await prisma.$queryRawUnsafe(`SELECT table_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('AppVersion','ResourceRelease') AND column_name='targetUserIds' ORDER BY table_name`);
    assert.equal(arrays.length, 2);
    assert(arrays.every(row => row.is_nullable === 'NO'));
    const registrations = await prisma.appDistribution.findMany({ orderBy: { platform: 'asc' } });
    assert.equal(registrations.length, 3);
    assert.deepEqual(registrations.map(row => row.platform), ['android', 'harmony', 'ios']);
    assert(registrations.every(row => row.channelId === 'legacy' && row.wgtPolicy === 'DENIED'));
    return { passed: true, ledger: ledger[0], checkConstraints: checks.map(row => row.conname), nullsNotDistinct: true,
      targetUserIdsNotNull: true, compatibilitySlots: registrations.map(({ platform, wgtPolicy }) => ({ platform, wgtPolicy })),
      snapshotColumns:snapshotColumns.map(c=>c.column_name),snapshotShapeCheck:true,orderNoticeShapeCheck:true,
      orderNoticeTableInitiallyEmpty:true,scope: 'formal-empty-bootstrap-only-not-production-upgrade' };
  }
  const jwt = req('jsonwebtoken');
  const rows = [];
  const request = async (name, user, route, expected, method = 'GET', body) => {
    const headers = user ? { Authorization: 'Bearer ' + jwt.sign({ sub: user, sessionIssuedAt: Date.now() }, process.env.JWT_SECRET, { expiresIn: '5m' }) } : {};
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch('http://127.0.0.1:3000/api/v1' + route, {
      method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000)
    });
    rows.push({ name, expected, status: response.status, passed: response.status === expected });
    assert.equal(response.status, expected, name);
    const json = await response.json();
    return json.data ?? json;
  };
  const route = '/system/distributions';
  const dto = { applicationId: 'rebu-isolated', productId: 'rebu-isolated', platform: 'android', channelId: 'official',
    clientKey: 'rebu-isolated-http', packageName: 'cn.invalid.isolated', signingCertificateSha256: 'a'.repeat(64), policyEvidence: '仅隔离验证，不构成渠道许可' };
  await request('anonymous-list-denied', null, route, 401);
  await request('ordinary-list-denied', 'linux-user-a', route, 403);
  await request('operation-list-allowed', 'linux-ops', route, 200);
  await request('operation-register-denied', 'linux-ops', route, 403, 'POST', dto);
  assert.equal(await prisma.appDistribution.count({ where: { clientKey: dto.clientKey } }), 0);
  await request('super-invalid-combination-denied', 'linux-super', route, 400, 'POST', { ...dto, platform: 'ios', channelId: 'xiaomi' });
  assert.equal(await prisma.appDistribution.count({ where: { clientKey: dto.clientKey } }), 0);
  const created = await request('super-register-allowed', 'linux-super', route, 201, 'POST', dto);
  assert.equal(created.wgtPolicy, 'DENIED');
  const stored = await prisma.appDistribution.findUnique({ where: { clientKey: dto.clientKey } });
  assert.equal(stored.wgtPolicy, 'DENIED');
  const visible = await request('anonymous-public-registration', null, route + '/public/' + dto.clientKey, 200);
  assert.deepEqual(Object.keys(visible).sort(), ['applicationId', 'channelId', 'clientKey', 'packageName', 'platform', 'productId']);
  assert.equal(visible.clientKey, dto.clientKey);
  await request('ordinary-operation-management-denied', 'linux-user-a', '/admin/feature-flags', 403);
  await request('operation-management-read-allowed', 'linux-ops', '/admin/feature-flags', 200);
  return { passed: true, rows, defaultWgtDenied: true, rejectedWritesLeaveNoRecord: true, publicFieldsMinimized: true,
    realJwtAndGuards: true, noExternalPublish: true };
}
main().then(result => console.log('NODE_TEST_RESULT:' + JSON.stringify(result)))
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
