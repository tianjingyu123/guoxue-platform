/** 实际密码登录、Redis限流与渠道登记联调；无正式账号、短信或外部依赖。 */
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const databaseUrl = 'postgresql://channel_test@127.0.0.1:55449/channel_synthetic?schema=channel_auth_phase11';
const redisUrl = 'redis://127.0.0.1:56380/13', enabled = process.env.REBU_CHANNEL_LOGIN_DATABASE_URL;
if (enabled && (enabled !== databaseUrl || process.env.REBU_CHANNEL_LOGIN_REDIS_URL !== redisUrl)) throw Error('仅允许本机独立数据库及Redis');

test('实际密码登录、跨实例限流及管理员能力登记权限', { skip: !enabled, timeout: 120000 }, async () => {
  const reportName = process.env.REBU_CHANNEL_LOGIN_REPORT;
  if (!/^phase13-login-(debug|fixed|final)-[a-z0-9-]+\.json$/.test(reportName || '')) throw Error('报告名称不在本阶段范围');
  const output = path.join(root, 'artifacts', reportName); if (fs.existsSync(output)) throw Error('不覆盖已有报告');
  const requireServer = createRequire(path.join(root, 'apps/server/package.json'));
  requireServer('reflect-metadata'); requireServer('ts-node').register({ project: path.join(root, 'apps/server/tsconfig.json'), transpileOnly: true });
  const { Test } = requireServer('@nestjs/testing'), { Reflector } = requireServer('@nestjs/core');
  const { ValidationPipe } = requireServer('@nestjs/common'), { PassportModule } = requireServer('@nestjs/passport');
  const { PrismaClient } = requireServer('@prisma/client'), { JwtService } = requireServer('@nestjs/jwt');
  const request = requireServer('supertest'), bcrypt = requireServer('bcryptjs');
  const load = file => require('../../apps/server/src/' + file + '.ts');
  const { AuthService } = load('modules/auth/auth.service'), { AuthController } = load('modules/auth/auth.controller');
  const { RedisService } = load('redis/redis.service'), { JwtStrategy } = load('common/jwt.strategy');
  const { JwtAuthGuard } = load('common/jwt-auth.guard'), { RolesGuard } = load('common/roles.guard');
  const { StrictRedisThrottleGuard } = load('common/redis-throttle.guard'), { RedLineGuard } = load('common/red-lines');
  const { PrismaService } = load('prisma/prisma.service'), { SystemService } = load('modules/system/system.service');
  const { AuditService } = load('modules/audit/audit.service'), { AuditInterceptor } = load('common/audit.interceptor');
  const { WechatService } = load('modules/auth/wechat.service'), { UniverifyBridgeService } = load('modules/auth/univerify-bridge.service');
  const { FeatureFlagService } = load('modules/feature-flag/feature-flag.service');
  const { ClientPresentationController } = load('modules/feature-flag/client-presentation.controller'), { ClientPresentationService } = load('modules/feature-flag/client-presentation.service');
  const { buildPhoneFields, maskPhone } = load('common/crypto.util');
  const { ErrorCode } = load('common/error-codes');
  const { APP_CHANNELS } = require('../../packages/shared/dist');
  const envNames = ['NODE_ENV', 'CLIENT_CAPABILITY_ENVIRONMENT', 'JWT_SECRET', 'JWT_PREVIOUS_SECRETS', 'ENCRYPTION_KEY', 'REDIS_URL', 'REDIS_SENTINEL_HOSTS', 'REDIS_SENTINEL_NAME', 'DISABLE_RATE_LIMIT'];
  const saved = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  process.env.NODE_ENV = 'test'; process.env.CLIENT_CAPABILITY_ENVIRONMENT = 'test'; process.env.DISABLE_RATE_LIMIT = 'false';
  const secret = crypto.randomBytes(64).toString('base64url'), password = 'Qa9-' + crypto.randomBytes(16).toString('hex');
  process.env.JWT_SECRET = secret; process.env.JWT_PREVIOUS_SECRETS = ''; process.env.ENCRYPTION_KEY = crypto.randomBytes(16).toString('hex');
  process.env.REDIS_URL = redisUrl; delete process.env.REDIS_SENTINEL_HOSTS; delete process.env.REDIS_SENTINEL_NAME;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const redisInstances = [new RedisService(), new RedisService()], apps = [], groups = [], acceptedIds = [];
  const applicationId = 'qa-login-' + crypto.randomUUID().slice(0, 8);
  const unused = new Proxy({}, { get: () => () => { throw Error('禁止调用本轮外部依赖'); } });
  let imAdapterCalls = 0;
  // 密码登录会导入IM，明确适配为本地计数，不连接外部IM。
  const imAdapter = { importAccount: async () => { imAdapterCalls++; } };
  const report = { verifiedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts', 'tests'], { cwd: root, encoding: 'utf8' }).trim()), syntheticOnly: true, applicationId, actualAuthController: true, actualAuthService: true, actualBcrypt: true, realRedisInstances: 2, realSystemAndAuditService: true, groups, formalLoginTested: false, imAdapter: '仅本地计数', credentialsRecorded: false, forwardedAddressFixture: '203.0.113.21/22；测试应用仅信任本机代理，用于避免回环限流白名单' };
  try {
    const [identity] = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS actor, inet_server_port() AS port, current_schema() AS schema');
    assert.deepEqual(identity, { db: 'channel_synthetic', actor: 'channel_test', port: 55449, schema: 'channel_auth_phase11' }); report.database = identity;
    await Promise.all(redisInstances.map(redis => redis.pingShared()));
    assert.ok(redisInstances.every(redis => redis.getClient()));
    const info = await redisInstances[0].getClient().info('server');
    report.redis = { host: '127.0.0.1', port: 56380, db: 13, version: info.match(/^redis_version:(.+)$/m)[1].trim(), memoryFallbackUsed: false };
    const credential = await bcrypt.hash(password, 10);
    const users = {};
    for (const [kind, roleType] of [['admin', 'SUPER_ADMIN'], ['operation', 'OPERATION_ADMIN'], ['ordinary', null], ['locked', null], ['limited', null]]) {
      const id = crypto.randomUUID(), phone = applicationId + '-' + kind;
      const user = await prisma.user.create({ data: { id, nickname: '独立合成密码账号', ...buildPhoneFields(phone), auths: { create: { provider: 'PASSWORD', namespace: 'password', subject: id, credential } }, ...(roleType ? { roles: { create: { roleType } } } : {}) } });
      users[kind] = { ...user, loginName: phone };
    }
    const clients = APP_CHANNELS.filter(channel => channel.id !== 'legacy').flatMap(channel => channel.platforms.map(platform => ({ channelId: channel.id, platform })));
    assert.equal(clients.length, 18);
    await prisma.appDistribution.createMany({ data: clients.map(client => ({ ...client, applicationId, productId: applicationId, clientKey: applicationId + '-' + client.channelId + '-' + client.platform, packageName: 'cn.rebu.synthetic.login', enabled: true, wgtPolicy: 'DENIED' })) });
    for (const redis of redisInstances) {
      const jwt = new JwtService({ secret, signOptions: { expiresIn: '2h' } });
      const auth = new AuthService(prisma, jwt, redis, unused, unused, imAdapter, unused, unused, unused, unused);
      const audit = new AuditService(prisma, redis, unused, unused, unused), system = new SystemService(prisma, redis, audit, unused, unused, unused);
      const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [AuthController, ClientPresentationController], providers: [Reflector, JwtStrategy, JwtAuthGuard, RolesGuard, StrictRedisThrottleGuard, ClientPresentationService, { provide: PrismaService, useValue: prisma }, { provide: RedisService, useValue: redis }, { provide: AuthService, useValue: auth }, { provide: SystemService, useValue: system }, { provide: WechatService, useValue: {} }, { provide: UniverifyBridgeService, useValue: {} }, { provide: FeatureFlagService, useValue: { requestScope: async () => null } }] }).compile();
      const app = module.createNestApplication({ logger: false }); apps.push(app);
      app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
      app.useGlobalGuards(new RedLineGuard(module.get(Reflector))); app.useGlobalInterceptors(new AuditInterceptor(audit));
      await app.listen(0, '127.0.0.1');
    }
    const status = async (call, expected) => { const response = await call; assert.equal(response.status, expected); return response; };
    const login = (kind, index = 0, changes = {}, ip = '203.0.113.21') => request(apps[index].getHttpServer()).post('/auth/login/phone').set('X-Forwarded-For', ip).send({ phone: users[kind].loginName, password, ...changes });
    const endpoint = '/admin/client-presentation/capabilities';
    const get = pair => request(apps[1].getHttpServer()).get(endpoint).set('Authorization', 'Bearer ' + pair.accessToken);
    const capability = client => ({ applicationId, ...client, nativeBuild: '310', minResourceVersion: '0', maxResourceVersion: '2', profileId: 'presentation-v1', sourceSha: 'a'.repeat(40), installedPackageSha256: 'b'.repeat(64), verificationLevel: 'synthetic' });
    const post = (pair, payload, automated = false) => { const call = request(apps[1].getHttpServer()).post(endpoint).set('Authorization', 'Bearer ' + pair.accessToken); if (automated) call.set('X-Executor-Type', 'AUTOMATION'); return call.send({ payload, reason: '独立合成密码登录验收' }); };
    await status(login('admin', 0, { injected: true }), 400);
    await status(login('admin', 0, { password: 'wrong-password' }), 401);
    const adminPair = (await status(login('admin'), 201)).body;
    assert.equal(adminPair.user.id, users.admin.id); assert.ok(adminPair.user.roles.some(role => role.roleType === 'SUPER_ADMIN'));
    const operationPair = (await status(login('operation', 1), 201)).body, ordinaryPair = (await status(login('ordinary'), 201)).body;
    await status(get(adminPair), 200); await status(get(operationPair), 200); await status(get(ordinaryPair), 403);
    await status(post(operationPair, capability(clients[0])), 403); await status(post(adminPair, capability(clients[0]), true), 403);
    for (const client of clients) { const response = await status(post(adminPair, capability(client)), 201); acceptedIds.push(response.body.id); }
    assert.equal(await prisma.appDistribution.count({ where: { applicationId, wgtPolicy: 'DENIED' } }), 18);
    groups.push('实际密码/DTO/控制器/Redis/JWT链通过，普通账号与运营写入拒绝，18个范围合成登记及自动化闸保持');

    // 更换模拟来源IP仍累计同一账号限流；实际Lua计数由两个服务实例共享。
    for (let index = 0; index < 10; index++) await status(login('limited', index % 2, { password: 'wrong-password' }, index % 2 ? '203.0.113.21' : '203.0.113.22'), 401);
    await status(login('limited', 1), 429);
    const rateKey = 'rate:strict:account:' + crypto.createHash('sha256').update('phone:' + users.limited.loginName).digest('hex').slice(0, 32);
    assert.equal(await redisInstances[1].get(rateKey), '11');
    assert.ok(await redisInstances[1].getClient().ttl(rateKey) > 0);
    assert.ok(await redisInstances[1].get('login:lock:' + users.limited.loginName));
    // 仅删除本轮夹具的限流计数，以独立验证实际账号失败锁；不清空Redis。
    await redisInstances[0].del(rateKey);
    await status(login('limited', 0), 401);
    assert.equal(await redisInstances[1].get('login:fail:' + users.limited.loginName), '10');
    groups.push('两实例及不同模拟IP共享账号限流，11次请求429；账号十次失败锁独立拒绝正确密码');

    for (const userStatus of ['BANNED', 'DISABLED']) {
      await prisma.user.update({ where: { id: users.admin.id }, data: { status: userStatus } });
      await status(get(adminPair), 401);
      const before = (await redisInstances[0].smembers('refresh:user:' + users.admin.id)).length;
      const imBefore = imAdapterCalls;
      const rejected = await status(login('admin', 1), 403);
      assert.equal(rejected.body.errorCode, ErrorCode.AUTH_USER_BANNED);
      assert.equal((await redisInstances[1].smembers('refresh:user:' + users.admin.id)).length, before);
      assert.equal(imAdapterCalls, imBefore);
      await prisma.user.update({ where: { id: users.admin.id }, data: { status: 'ACTIVE' } });
    }
    groups.push('封禁和停用账号正确密码仍被拒绝，不创建refresh会话、不触发IM适配，旧JWT拒绝');
    for (let attempt = 0; attempt < 40; attempt++) { if (await prisma.auditLog.count({ where: { userId: users.admin.id, targetId: { in: acceptedIds } } }) === 18) break; await new Promise(resolve => setTimeout(resolve, 20)); }
    const capabilityAudits = await prisma.auditLog.findMany({ where: { userId: users.admin.id, targetId: { in: acceptedIds } } });
    assert.equal(capabilityAudits.length, 18);
    const loginAudits = await prisma.auditLog.findMany({ where: { userId: { in: Object.values(users).map(user => user.id) }, action: 'LOGIN' } });
    assert.equal(loginAudits.length, 3);
    const allActorAudits = await prisma.auditLog.findMany({ where: { OR: [{ userId: { in: Object.values(users).map(user => user.id) } }, { targetId: { in: Object.values(users).map(user => maskPhone(user.loginName)) } }] } });
    assert.ok(allActorAudits.every(row => !JSON.stringify(row).includes(password) && !JSON.stringify(row).includes(secret) && !JSON.stringify(row).includes('Bearer ')));
    groups.push('实际SystemService/AuditService持久化登录与登记审计，不记录随机密码、JWT或密钥');
    Object.assign(report, { passedAll: true, commonStores: 16, distributionScopes: 18, acceptedRecords: 18, capabilityAudits: 18, successfulLoginAudits: 3, deniedScopes: 18, imAdapterCalls, formalCapabilityRegistered: false, cEnabled: false, externalWrites: false });
  } catch (error) { report.passedAll = false; report.failure = error.message; throw error; }
  finally {
    for (const app of apps) await app.close();
    await Promise.all(redisInstances.map(redis => redis.onModuleDestroy())); await prisma.$disconnect();
    report.httpRedisAndDatabaseClientsStopped = true;
    for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
});
