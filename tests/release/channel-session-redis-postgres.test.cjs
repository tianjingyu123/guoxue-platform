/** 实际AuthService/Redis/JWT/登记事务联调，仅允许本机独立合成环境。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const databaseUrl = 'postgresql://channel_test@127.0.0.1:55449/channel_synthetic?schema=channel_auth_phase11';
const redisUrl = 'redis://127.0.0.1:56379/13';
const enabled = process.env.REBU_CHANNEL_SESSION_DATABASE_URL;
if (enabled && (enabled !== databaseUrl || process.env.REBU_CHANNEL_SESSION_REDIS_URL !== redisUrl)) throw Error('仅允许本机独立数据库及Redis');

test('真实共享Redis会话轮换、撤销和封禁，实际JWT保护能力登记', { skip: !enabled, timeout: 120000 }, async () => {
  const reportName = process.env.REBU_CHANNEL_SESSION_REPORT;
  if (!/^phase12-session-(debug|fixed|final)-[a-z0-9-]+\.json$/.test(reportName || '')) throw Error('报告名称必须是本阶段新的独立文件');
  const output = path.join(root, 'artifacts', reportName);
  if (fs.existsSync(output)) throw Error('不覆盖已有报告');
  const requireServer = createRequire(path.join(root, 'apps/server/package.json'));
  requireServer('reflect-metadata');
  requireServer('ts-node').register({ project: path.join(root, 'apps/server/tsconfig.json'), transpileOnly: true });
  const { Test } = requireServer('@nestjs/testing'), { Reflector } = requireServer('@nestjs/core');
  const { ValidationPipe } = requireServer('@nestjs/common'), { PassportModule } = requireServer('@nestjs/passport');
  const { PrismaClient } = requireServer('@prisma/client'), { JwtService } = requireServer('@nestjs/jwt');
  const request = requireServer('supertest');
  const { AuthService } = require('../../apps/server/src/modules/auth/auth.service.ts');
  const { RedisService } = require('../../apps/server/src/redis/redis.service.ts');
  const { JwtStrategy } = require('../../apps/server/src/common/jwt.strategy.ts');
  const { JwtAuthGuard } = require('../../apps/server/src/common/jwt-auth.guard.ts');
  const { RolesGuard } = require('../../apps/server/src/common/roles.guard.ts');
  const { RedLineGuard } = require('../../apps/server/src/common/red-lines.ts');
  const { AuditInterceptor } = require('../../apps/server/src/common/audit.interceptor.ts');
  const { AuditService } = require('../../apps/server/src/modules/audit/audit.service.ts');
  const { PrismaService } = require('../../apps/server/src/prisma/prisma.service.ts');
  const { ClientPresentationController } = require('../../apps/server/src/modules/feature-flag/client-presentation.controller.ts');
  const { ClientPresentationService } = require('../../apps/server/src/modules/feature-flag/client-presentation.service.ts');
  const { FeatureFlagService } = require('../../apps/server/src/modules/feature-flag/feature-flag.service.ts');
  const { ErrorCode } = require('../../apps/server/src/common/error-codes.ts');
  const { APP_CHANNELS } = require('../../packages/shared/dist');
  const { distributionKey } = require('../../apps/server/src/modules/system/distribution.util.ts');
  const envNames = ['NODE_ENV', 'CLIENT_CAPABILITY_ENVIRONMENT', 'JWT_SECRET', 'JWT_PREVIOUS_SECRETS', 'REDIS_URL', 'REDIS_SENTINEL_HOSTS', 'REDIS_SENTINEL_NAME'];
  const saved = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  process.env.NODE_ENV = 'test'; process.env.CLIENT_CAPABILITY_ENVIRONMENT = 'test';
  const secret = crypto.randomBytes(64).toString('base64url');
  process.env.JWT_SECRET = secret; process.env.JWT_PREVIOUS_SECRETS = '';
  process.env.REDIS_URL = redisUrl; delete process.env.REDIS_SENTINEL_HOSTS; delete process.env.REDIS_SENTINEL_NAME;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const redisA = new RedisService(), redisB = new RedisService();
  const jwt = new JwtService({ secret, signOptions: { expiresIn: '2h' } });
  // 本轮不调用短信、微信、支付、IM或Webhook；依赖一旦被调用即令测试失败。
  const unused = new Proxy({}, { get: () => () => { throw Error('本轮禁止调用外部依赖'); } });
  const authA = new AuthService(prisma, jwt, redisA, unused, unused, unused, unused, unused, unused, unused);
  const authB = new AuthService(prisma, jwt, redisB, unused, unused, unused, unused, unused, unused, unused);
  const apps = [], acceptedIds = [], groups = [];
  const applicationId = 'qa-session-' + crypto.randomUUID().slice(0, 8);
  const report = { verifiedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts', 'tests'], { cwd: root, encoding: 'utf8' }).trim()), syntheticOnly: true, applicationId, realAuthService: true, realRedisServiceInstances: 2, realJwtGuard: true, realPrismaPostgres: true, passwordOrFormalLoginTested: false, externalDependenciesForbidden: true, groups };
  const invalidToken = error => error.errorCode === ErrorCode.AUTH_TOKEN_INVALID;
  const pairFor = async (auth, id) => auth.exchangeHandoffCode((await auth.issueHandoffCode(id)).code);
  try {
    const [identity] = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS actor, inet_server_port() AS port, current_schema() AS schema');
    assert.deepEqual(identity, { db: 'channel_synthetic', actor: 'channel_test', port: 55449, schema: 'channel_auth_phase11' });
    await Promise.all([redisA.pingShared(), redisB.pingShared()]);
    const clientA = redisA.getClient(), clientB = redisB.getClient();
    assert.ok(clientA && clientB && clientA !== clientB);
    const infoA = await clientA.info('server'), infoB = await clientB.info('server');
    const field = (info, name) => info.match(new RegExp('^' + name + ':(.+)$', 'm'))?.[1].trim();
    assert.equal(field(infoA, 'run_id'), field(infoB, 'run_id'));
    report.redis = { host: '127.0.0.1', port: 56379, db: 13, version: field(infoA, 'redis_version'), sameServerVerified: true, memoryFallbackUsed: false };
    report.database = identity;
    const clients = APP_CHANNELS.filter(channel => channel.id !== 'legacy').flatMap(channel => channel.platforms.map(platform => ({ channelId: channel.id, platform })));
    assert.equal(clients.length, 18);
    await prisma.appDistribution.createMany({ data: clients.map(client => ({ ...client, applicationId, productId: applicationId, clientKey: applicationId + '-' + client.channelId + '-' + client.platform, packageName: 'cn.rebu.synthetic.sessionqa', wgtPolicy: 'DENIED', enabled: true })) });
    const admin = await prisma.user.create({ data: { nickname: '独立合成会话管理员', roles: { create: { roleType: 'SUPER_ADMIN' } } } });
    const other = await prisma.user.create({ data: { nickname: '独立合成隔离账号', roles: { create: { roleType: 'OPERATION_ADMIN' } } } });
    for (const redis of [redisA, redisB]) {
      const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [ClientPresentationController], providers: [Reflector, JwtStrategy, JwtAuthGuard, RolesGuard, ClientPresentationService, { provide: PrismaService, useValue: prisma }, { provide: RedisService, useValue: redis }, { provide: FeatureFlagService, useValue: { requestScope: async () => null } }] }).compile();
      const app = module.createNestApplication({ logger: false }); apps.push(app);
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
      app.useGlobalGuards(new RedLineGuard(module.get(Reflector)));
      app.useGlobalInterceptors(new AuditInterceptor(new AuditService(prisma, null, null, null, null)));
      await app.listen(0, '127.0.0.1');
    }
    const endpoint = '/admin/client-presentation/capabilities';
    const get = (index, pair) => request(apps[index].getHttpServer()).get(endpoint).set('Authorization', 'Bearer ' + pair.accessToken);
    const status = async (call, expected) => { const response = await call; assert.equal(response.status, expected); return response; };
    const handoff = await authA.issueHandoffCode(admin.id);
    const handoffRace = await Promise.allSettled([authA.exchangeHandoffCode(handoff.code), authB.exchangeHandoffCode(handoff.code)]);
    assert.equal(handoffRace.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(handoffRace.filter(result => result.status === 'rejected' && invalidToken(result.reason)).length, 1);
    const initial = handoffRace.find(result => result.status === 'fulfilled').value;
    for (const index of [0, 1]) await status(get(index, initial), 200);
    assert.equal(await redisB.get('refresh:' + initial.refreshToken), admin.id);
    assert.ok(await clientB.ttl('refresh:' + initial.refreshToken) > 29 * 24 * 3600);
    assert.ok((await redisB.smembers('refresh:user:' + admin.id)).includes(initial.refreshToken));
    groups.push('两个实际RedisService和HTTP应用共享同一Redis；实际AuthService签发及一次性握手码跨实例消费通过');

    const refreshRace = await Promise.allSettled([authA.refreshToken(initial.refreshToken), authB.refreshToken(initial.refreshToken)]);
    assert.equal(refreshRace.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(refreshRace.filter(result => result.status === 'rejected' && invalidToken(result.reason)).length, 1);
    const rotated = refreshRace.find(result => result.status === 'fulfilled').value;
    await assert.rejects(authB.refreshToken(initial.refreshToken), invalidToken);
    for (const index of [0, 1]) await status(get(index, rotated), 200);
    const otherPair = await pairFor(authB, other.id);
    const mintedAt = jwt.decode(rotated.accessToken).sessionIssuedAt;
    while (Date.now() <= mintedAt) await new Promise(resolve => setTimeout(resolve, 1));
    await authA.revokeAllRefreshTokens(admin.id);
    for (const index of [0, 1]) await status(get(index, rotated), 401);
    await assert.rejects(authB.refreshToken(rotated.refreshToken), invalidToken);
    assert.equal((await redisB.smembers('refresh:user:' + admin.id)).length, 0);
    assert.ok(await clientB.ttl('revoked:user:' + admin.id) > 2 * 3600);
    await status(get(1, otherPair), 200);
    const fresh = await pairFor(authB, admin.id);
    for (const index of [0, 1]) await status(get(index, fresh), 200);
    groups.push('实际Lua跨实例刷新仅一次成功；真实撤销同时阻断两应用旧access/refresh，保留其他用户及撤销后新会话');

    const capability = { applicationId, channelId: 'huawei', platform: 'android', nativeBuild: '300', minResourceVersion: '0', maxResourceVersion: '2', profileId: 'presentation-v1', sourceSha: 'a'.repeat(40), installedPackageSha256: 'b'.repeat(64), verificationLevel: 'synthetic' };
    const post = payload => request(apps[1].getHttpServer()).post(endpoint).set('Authorization', 'Bearer ' + fresh.accessToken).send({ payload, reason: '独立真实Redis会话验证' });
    const created = await status(post(capability), 201); acceptedIds.push(created.body.id);
    // 上阶段已实现的旧数值兼容，本轮使用真实数据库夹具补验。
    const historical = { ...capability, nativeBuild: 301, minResourceVersion: 0, maxResourceVersion: 2 };
    const row = await prisma.configVersion.create({ data: { configKey: 'client_capability:' + distributionKey(capability) + ':301:0-2', version: 1, changedBy: admin.id, value: historical, comment: '独立合成旧数值夹具' } });
    await status(post({ ...capability, nativeBuild: '301', minResourceVersion: '1' }), 400);
    assert.deepEqual((await prisma.configVersion.findUnique({ where: { id: row.id } })).value, historical);
    assert.equal(await prisma.appDistribution.count({ where: { applicationId, wgtPolicy: 'DENIED' } }), 18);
    for (let attempt = 0; attempt < 30; attempt++) { if (await prisma.auditLog.count({ where: { userId: admin.id, targetId: { in: acceptedIds } } }) === 1) break; await new Promise(resolve => setTimeout(resolve, 20)); }
    assert.equal(await prisma.auditLog.count({ where: { userId: admin.id, targetId: { in: acceptedIds } } }), 1);
    groups.push('服务签发的新会话可登记合成能力且产生实际审计；旧数值版本夹具冲突拒绝并保留，18范围C仍拒绝');

    for (const userStatus of ['BANNED', 'DISABLED']) {
      const beforeBan = await pairFor(authA, admin.id);
      const pendingHandoff = await authA.issueHandoffCode(admin.id);
      await prisma.user.update({ where: { id: admin.id }, data: { status: userStatus } });
      for (const index of [0, 1]) await status(get(index, beforeBan), 401);
      await assert.rejects(authB.refreshToken(beforeBan.refreshToken), invalidToken);
      await assert.rejects(authB.exchangeHandoffCode(pendingHandoff.code), invalidToken);
      await prisma.user.update({ where: { id: admin.id }, data: { status: 'ACTIVE' } });
    }
    groups.push('封禁和停用同时阻断实际JWT读取、AuthService刷新及待消费握手码，不再续发会话');
    Object.assign(report, { passedAll: true, commonStores: 16, distributionScopes: 18, deniedScopes: 18, acceptedRecords: 1, auditRecords: 1, historicalNumericFixture: 1, externalWrites: false, formalCapabilityRegistered: false, cEnabled: false });
  } catch (error) { report.passedAll = false; report.failure = error.message; throw error; }
  finally {
    for (const app of apps) await app.close();
    await Promise.all([redisA.onModuleDestroy(), redisB.onModuleDestroy()]);
    await prisma.$disconnect(); report.httpRedisAndDatabaseClientsStopped = true;
    for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
});
