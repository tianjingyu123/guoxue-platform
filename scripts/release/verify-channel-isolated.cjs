// 只接受专用本机合成库；不读取项目环境文件或连接生产。
const assert = require('node:assert/strict')
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs')
const { execFileSync } = require('node:child_process')
const { createRequire } = require('node:module')
const path = require('node:path')
const url = process.env.CHANNEL_TEST_DATABASE_URL
if (!url || !/^postgresql:\/\/channel_test@127\.0\.0\.1:55449\/channel_synthetic$/.test(url)) {
  throw new Error('必须指定独立本机 channel_synthetic 合成库')
}
process.env.DATABASE_URL = url
process.env.NODE_ENV = 'test'
process.env.ENCRYPTION_KEY = 'synthetic-channel-test-key-32byte'
const serverRequire = createRequire(path.resolve(__dirname, '../../apps/server/package.json'))
const { PrismaClient } = serverRequire('@prisma/client')
const { DistributionService } = require('../../apps/server/dist/modules/system/distribution.service')
const { DistributionController } = require('../../apps/server/dist/modules/system/distribution.controller')
const { VersionController } = require('../../apps/server/dist/modules/system/version.controller')
const { FeatureFlagService } = require('../../apps/server/dist/modules/feature-flag/feature-flag.service')
const { FeatureFlagController } = require('../../apps/server/dist/modules/feature-flag/feature-flag.controller')
const { ResourceReleaseService } = require('../../apps/server/dist/modules/system/resource-release.service')
const { canonicalManifest } = require('../../packages/shared/dist/resource-update')
const { generateKeyPairSync, sign, createHash } = require('node:crypto')

async function run() {
  const prisma = new PrismaClient()
  const evidence = []
  const record = (name) => { evidence.push(name); console.log('通过：' + name) }
  try {
    await prisma.$connect()
    const identity = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS actor, inet_server_port() AS port')
    assert.equal(identity[0].db, 'channel_synthetic')
    assert.equal(identity[0].actor, 'channel_test')
    assert.equal(identity[0].port, 55449)
    if (process.argv.includes('--reset')) {
      await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE')
      await prisma.$executeRawUnsafe('CREATE SCHEMA public')
    }
    // 这是仅包含本专项表的历史结构；通过真正 ALTER 迁移，而非 db push 伪装升级。
    await prisma.$executeRawUnsafe('CREATE TABLE "AppVersion" ("id" TEXT PRIMARY KEY, "platform" TEXT NOT NULL, "version" TEXT NOT NULL, "buildNumber" TEXT, "changelog" TEXT, "forceUpdate" BOOLEAN NOT NULL DEFAULT false, "downloadUrl" TEXT, "checksumSha256" TEXT, "minSupportedVersion" TEXT, "minSupportedBuildNumber" TEXT, "status" TEXT NOT NULL DEFAULT \'DRAFT\', "activePlatformKey" TEXT UNIQUE, "publishedAt" TIMESTAMP(3), "publishedBy" TEXT, "retiredAt" TIMESTAMP(3), "retiredBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
    await prisma.$executeRawUnsafe('CREATE TABLE "FeatureFlag" ("id" TEXT PRIMARY KEY, "key" TEXT UNIQUE NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT false, "percentage" INTEGER NOT NULL DEFAULT 100, "targetUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
    await prisma.$executeRawUnsafe('CREATE TABLE "ConfigVersion" ("id" TEXT PRIMARY KEY, "configKey" TEXT NOT NULL, "value" JSONB NOT NULL, "version" INTEGER NOT NULL, "changedBy" TEXT, "comment" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)')
    await prisma.$executeRawUnsafe('INSERT INTO "AppVersion" ("id","platform","version","buildNumber","status","activePlatformKey","downloadUrl") VALUES (\'old-active\',\'android\',\'1.0.0\',\'100\',\'ACTIVE\',\'android\',\'https://download.example.test/legacy.apk\')')
    const sql = readFileSync(path.resolve(__dirname, '../../apps/server/prisma/migrations/20260930090000_app_distribution_and_operations/migration.sql'), 'utf8')
    await prisma.$transaction(async tx => {
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement)
    })
    assert.equal((await prisma.appVersion.findUnique({ where: { id: 'old-active' } })).activePlatformKey, 'rebu:android:legacy')
    record('真实迁移保留历史版本并隔离 legacy 活动槽')
    const distributions = new DistributionService(prisma)
    const versions = new VersionController(prisma, distributions)
    const registry = new DistributionController(prisma)
    const catalog = registry.catalog()
    for (const id of ['huawei', 'xiaomi', 'oppo', 'oneplus', 'vivo', 'honor', 'realme', 'tencent', 'samsung', 'google-play', 'app-store']) assert.ok(catalog.some(channel => channel.id === id))
    for (const channel of catalog.filter(channel => channel.id !== 'legacy')) {
      for (const platform of channel.platforms) {
        const clientKey = 'test-' + channel.id + (platform === 'android' ? '' : '-' + platform)
        const registered = await registry.create({ productId: 'rebu', applicationId: 'rebu', platform, channelId: channel.id, clientKey, packageName: 'test.rebu.' + channel.id })
        assert.equal(registered.wgtPolicy, 'DENIED')
        assert.equal((await registry.publicRegistration(clientKey)).channelId, channel.id)
      }
    }
    assert.throws(() => registry.create({ productId: 'rebu', applicationId: 'rebu', platform: 'ios', channelId: 'huawei', clientKey: 'test-invalid', packageName: 'test.invalid' }))
    record('全部常见商店目录与各平台登记可用，默认拒绝WGT，错误平台组合拒绝')
    const req = { user: { id: 'synthetic-admin' } }
    const make = async (channelId, buildNumber) => versions.adminCreate({
      platform: 'android', applicationId: 'rebu', channelId, version: '1.1.0', buildNumber,
      changelog: '合成渠道验证', downloadUrl: 'https://download.example.test/' + channelId + '.apk',
    })
    const x = await make('xiaomi', '253'), h = await make('huawei', '253')
    await Promise.all([versions.publish(x.id, req), versions.publish(h.id, req)])
    assert.equal(await prisma.appVersion.count({ where: { status: 'ACTIVE' } }), 3)
    for (const channel of ['xiaomi', 'huawei']) {
      const found = await versions.check({ platform: 'android', version: '1.0.0', buildNumber: '100', clientKey: 'test-' + channel })
      assert.ok(found.latest.downloadUrl.includes(channel))
    }
    record('小米华为并发发布不串包且不退役另一渠道与历史槽')
    const legacy = await versions.check({ platform: 'android', version: '0.9.0' })
    assert.ok(legacy.latest.downloadUrl.includes('legacy'))
    assert.equal((await versions.check({ platform: 'android', version: '0.9.0', clientKey: 'unknown' })).hasUpdate, false)
    assert.equal((await versions.check({ platform: 'android', version: '0.9.0', channelId: 'xiaomi' })).hasUpdate, false)
    record('旧客户端 legacy 兼容、未知渠道及直接自报渠道均不串包')
    const x2 = await make('xiaomi', '254'), x3 = await make('xiaomi', '255')
    const concurrent = await Promise.allSettled([versions.publish(x2.id, req), versions.publish(x3.id, req)])
    assert.ok(concurrent.some(v => v.status === 'fulfilled'))
    assert.equal(await prisma.appVersion.count({ where: { applicationId: 'rebu', platform: 'android', channelId: 'xiaomi', status: 'ACTIVE' } }), 1)
    const activeX = await prisma.appVersion.findFirst({ where: { channelId: 'xiaomi', status: 'ACTIVE' } })
    await versions.retire(activeX.id, req)
    assert.equal((await prisma.appVersion.findUnique({ where: { id: h.id } })).status, 'ACTIVE')
    await versions.rollback(x.id, req)
    assert.equal((await prisma.appVersion.findUnique({ where: { id: h.id } })).status, 'ACTIVE')
    record('同渠道并发只有一条 ACTIVE，停发及回退不影响其他渠道')
    const grey = await make('xiaomi', '260')
    await versions.adminUpdate(grey.id, { rolloutPercentage: 0, targetUserIds: ['synthetic-a'], forceUpdate: true })
    await versions.publish(grey.id, req)
    const required = await versions.check({ platform: 'android', version: '1.1.0', buildNumber: '253', clientKey: 'test-xiaomi' })
    assert.equal(required.latest.forceUpdate, true)
    const optional = await make('xiaomi', '261')
    await versions.adminUpdate(optional.id, { rolloutPercentage: 0, targetUserIds: ['synthetic-a'] })
    await versions.publish(optional.id, req)
    const currentQuery = { platform: 'android', version: '1.1.0', buildNumber: '260', clientKey: 'test-xiaomi' }
    assert.equal((await versions.check(currentQuery, { user: { id: 'synthetic-a' } })).hasUpdate, true)
    assert.equal((await versions.check(currentQuery, { user: { id: 'synthetic-b' } })).hasUpdate, false)
    record('同渠道最低支持线继承与账号灰度，强制安全线不被可选灰度挡住')
    const flags = new FeatureFlagService(prisma, { getJson: async () => null, setJson: async () => {}, del: async () => {} }, distributions)
    await flags.upsert('shop_checkout', { enabled: true, scopeRules: [{ applicationId: 'rebu', platform: 'android', channelId: 'xiaomi', state: 'UNOPENED' }] }, 'synthetic-admin')
    const xs = await distributions.requestScope({ headers: { 'x-app-client': 'test-xiaomi' } })
    const hs = await distributions.requestScope({ headers: { 'x-app-client': 'test-huawei' } })
    assert.equal(await flags.isEnabled('shop_checkout', 'synthetic-a', xs), false)
    assert.equal(await flags.isEnabled('shop_checkout', 'synthetic-a', hs), true)
    assert.equal(await flags.isEnabled('shop_checkout', 'synthetic-a'), false)
    const flagAdmin = new FeatureFlagController(flags)
    assert.equal((await flagAdmin.preview('shop_checkout', {}, req, { clientKey: 'test-huawei', userId: 'synthetic-a', nativeBuild: '253' })).state, 'OPEN')
    assert.equal((await flagAdmin.preview('shop_checkout', {}, req, { clientKey: 'test-xiaomi', userId: 'synthetic-a', nativeBuild: '253' })).state, 'UNOPENED')
    assert.equal((await flagAdmin.preview('shop_checkout', {}, req)).state, 'UNOPENED')
    await flags.upsert('client_emergency_close', { enabled: true })
    assert.equal(await flags.isEnabled('shop_checkout', 'synthetic-a', hs), false)
    await flags.upsert('client_emergency_close', { enabled: false })
    const draft = await flags.saveDraft('shop_checkout', { enabled: true, operationState: 'READ_ONLY', scopeRules: [] }, 'synthetic-admin')
    assert.equal(await flags.getOperationState('shop_checkout', 'synthetic-a', hs), 'OPEN')
    assert.equal((await flags.preview('shop_checkout', { operationState: 'READ_ONLY' }, 'synthetic-a', hs)).state, 'READ_ONLY')
    await flags.publishDraft(draft.id, 'synthetic-admin')
    assert.equal(await flags.isEnabled('shop_checkout', 'synthetic-a', hs), false)
    const history = await flags.getHistory('shop_checkout')
    await flags.rollback('shop_checkout', history.find(r => r.value.operationState === 'OPEN').version, 'synthetic-admin')
    assert.equal(await flags.isEnabled('shop_checkout', 'synthetic-a', hs), true)
    record('运营草稿预览不生效、发布与审计回退有效，全局急停不能被渠道放宽')
    // 临时签名私钥只在进程内，日志与仓库均不保存。
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    process.env.WGT_TRUSTED_PUBLIC_KEYS = JSON.stringify({ 'test-key': publicKey.export({ type: 'spki', format: 'pem' }) })
    process.env.WGT_ALLOWED_ORIGINS = 'https://download.example.test'
    const bytes = Buffer.from('synthetic-resource-fixture')
    const now = Date.now()
    const manifest = {
      schemaVersion: 1, releaseId: 'synthetic-resource-v1', productId: 'rebu', applicationId: 'rebu', platform: 'android', channelId: 'xiaomi',
      packageName: 'test.rebu.xiaomi', runtimeAppId: '__TEST_APP', resourceVersion: 1, minNativeBuild: 253, maxNativeBuild: 300,
      nativeFingerprint: 'a'.repeat(64), downloadUrl: 'https://download.example.test/test.wgt', byteLength: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'), keyId: 'test-key',
      issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString(), changeType: 'web-resources',
    }
    const signed = { manifest, signature: sign(null, Buffer.from(canonicalManifest(manifest)), privateKey).toString('base64') }
    const resources = new ResourceReleaseService(prisma, distributions)
    const resource = await resources.draft({ ...signed, rolloutPercentage: 0, targetUserIds: ['synthetic-a'] })
    await assert.rejects(resources.activate(resource.id, 'synthetic-admin'), /禁止发布 WGT/)
    resources.verifyManifest(signed)
    assert.throws(() => resources.verifyManifest({ ...signed, manifest: { ...manifest, byteLength: bytes.length - 1 } }))
    assert.throws(() => resources.verifyManifest({ ...signed, signature: 'A'.repeat(86) + '==' }))
    await prisma.appDistribution.update({ where: { clientKey: 'test-xiaomi' }, data: { wgtPolicy: 'ALLOWED', policyEvidence: '仅合成许可', recoveryEvidence: '仅模拟原生恢复', nativeFingerprint: 'a'.repeat(64) } })
    await resources.activate(resource.id, 'synthetic-admin')
    assert.ok(await resources.check('test-xiaomi', 253, 0, 'synthetic-a'))
    assert.equal(await resources.check('test-xiaomi', 252, 0, 'synthetic-a'), null)
    assert.equal(await resources.check('test-huawei', 253, 0, 'synthetic-a'), null)
    assert.equal(await resources.check('test-xiaomi', 253, 0, 'synthetic-b'), null)
    await resources.retire(resource.id)
    assert.equal(await resources.check('test-xiaomi', 253, 0, 'synthetic-a'), null)
    record('真实签名校验、未许可拒绝发布、渠道与基座范围、资源灰度及停发')
    const report = { date: new Date().toISOString(), database: 'localhost:55449/channel_synthetic', syntheticOnly: true, passed: evidence,
      limits: ['仅本专项历史表结构与合成记录', '没有正式安装或启动前原生恢复实测', '没有生产资源签名或渠道许可'] }
    mkdirSync(path.resolve(__dirname, '../../docs/operations/channel-updates-evidence'), { recursive: true })
    writeFileSync(path.resolve(__dirname, '../../docs/operations/channel-updates-evidence/isolated-db.json'), JSON.stringify(report, null, 2) + '\n')
  } finally { await prisma.$disconnect(); delete process.env.WGT_TRUSTED_PUBLIC_KEYS }
}
run().catch(error => { console.error(error); process.exitCode = 1 })
