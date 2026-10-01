/** 可信手机号消息交换及已验证Apple身份后的本站会话链；外部身份验证明确适配。 */
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const databaseUrl = 'postgresql://channel_test@127.0.0.1:55449/channel_synthetic?schema=channel_auth_phase11';
const redisUrl = 'redis://127.0.0.1:56382/13', enabled = process.env.REBU_CHANNEL_TRUSTED_DATABASE_URL;
if (enabled && (enabled !== databaseUrl || process.env.REBU_CHANNEL_TRUSTED_REDIS_URL !== redisUrl)) throw Error('仅允许本机独立数据库与Redis');
test('可信手机号交换、防重放和共用登录返回的封禁会话规则', { skip: !enabled, timeout: 120000 }, async () => {
  const name = process.env.REBU_CHANNEL_TRUSTED_REPORT;
  if (!/^phase15-trusted-(debug|fixed|final)-[a-z0-9-]+\.json$/.test(name || '')) throw Error('报告名称不在本阶段范围');
  const output = path.join(root, 'artifacts', name); if (fs.existsSync(output)) throw Error('不覆盖报告');
  const requireServer = createRequire(path.join(root, 'apps/server/package.json'));
  requireServer('reflect-metadata'); requireServer('ts-node').register({ project: path.join(root, 'apps/server/tsconfig.json'), transpileOnly: true });
  const { PrismaClient } = requireServer('@prisma/client'), { JwtService } = requireServer('@nestjs/jwt');
  const load = file => require('../../apps/server/src/' + file + '.ts');
  const { AuthService } = load('modules/auth/auth.service'), { UniverifyBridgeService } = load('modules/auth/univerify-bridge.service');
  const { RedisService } = load('redis/redis.service'), { buildPhoneFields } = load('common/crypto.util'), { ErrorCode } = load('common/error-codes');
  const { APP_CHANNELS } = require('../../packages/shared/dist');
  const names = ['NODE_ENV', 'JWT_SECRET', 'ENCRYPTION_KEY', 'REDIS_URL', 'REDIS_SENTINEL_HOSTS', 'REDIS_SENTINEL_NAME', 'REBU_UNIVERIFY_SHARED_SECRET'];
  const saved = Object.fromEntries(names.map(key => [key, process.env[key]]));
  const secret = crypto.randomBytes(64).toString('base64url'), bridgeSecret = crypto.randomBytes(48).toString('hex');
  process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = secret; process.env.ENCRYPTION_KEY = crypto.randomBytes(16).toString('hex');
  process.env.REDIS_URL = redisUrl; process.env.REBU_UNIVERIFY_SHARED_SECRET = bridgeSecret;
  delete process.env.REDIS_SENTINEL_HOSTS; delete process.env.REDIS_SENTINEL_NAME;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } }), redis = [new RedisService(), new RedisService()], groups = [];
  const jwt = new JwtService({ secret, signOptions: { expiresIn: '2h' } }), applicationId = 'qa-trusted-' + crypto.randomUUID().slice(0, 8);
  const audience = applicationId + '.apple-test'; let imCalls = 0;
  const im = { importAccount: async () => { imCalls++; } }, unused = new Proxy({}, { get: () => () => { throw Error('本轮不允许外部调用'); } });
  const identities = new Map(), appleAdapter = { verifyIdentityToken: async value => { const identity = identities.get(value); if (!identity) throw Error('本地身份夹具不存在'); return identity; } };
  const auth = redis.map(instance => new AuthService(prisma, jwt, instance, unused, appleAdapter, im, unused, unused, unused, unused));
  const bridge = auth.map((instance, index) => new UniverifyBridgeService(instance, redis[index]));
  const report = { verifiedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts', 'tests'], { cwd: root, encoding: 'utf8' }).trim()), syntheticOnly: true, applicationId, groups, actualAuthService: true, actualUniverifyBridge: true, actualRedisInstances: 2, appleIdentityVerifier: '固定合成身份适配，未测试Apple签名或网络', actualProviderIdentityVerified: false, httpControllerTested: false, imAdapter: '本地计数', keysOrTokensRecorded: false };
  try {
    const [identity] = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS actor, inet_server_port() AS port, current_schema() AS schema');
    assert.deepEqual(identity, { db: 'channel_synthetic', actor: 'channel_test', port: 55449, schema: 'channel_auth_phase11' }); report.database = identity;
    await Promise.all(redis.map(instance => instance.pingShared())); assert.ok(redis.every(instance => instance.getClient()));
    const info = await redis[0].getClient().info('server'); report.redis = { host: '127.0.0.1', port: 56382, db: 13, version: info.match(/^redis_version:(.+)$/m)[1].trim(), memoryFallbackUsed: false };
    const users = {};
    for (const state of ['ACTIVE', 'BANNED', 'DISABLED']) {
      const id = crypto.randomUUID(), phone = applicationId + '-' + state;
      users[state] = { id, phone };
      identities.set(state, { subject: id, audience, emailVerified: false, isPrivateEmail: false });
      await prisma.user.create({ data: { id, nickname: '独立合成可信身份账号', status: state, ...buildPhoneFields(phone), auths: { create: { provider: 'APPLE', namespace: 'apple:' + audience, subject: id, appId: audience } } } });
    }
    const message = (state, timestamp = Date.now()) => {
      const value = { phone: users[state].phone, timestamp, nonce: crypto.randomUUID().replaceAll('-', '') };
      value.signature = crypto.createHmac('sha256', bridgeSecret).update(`${value.phone}\n${value.timestamp}\n${value.nonce}\n`).digest('hex'); return value;
    };
    const active = message('ACTIVE');
    const race = await Promise.allSettled([bridge[0].exchange(active), bridge[1].exchange(active)]);
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(race.filter(result => result.status === 'rejected' && result.reason.errorCode === ErrorCode.AUTH_TOKEN_INVALID).length, 1);
    assert.equal(jwt.verify(race.find(result => result.status === 'fulfilled').value.accessToken).sub, users.ACTIVE.id);
    await assert.rejects(bridge[1].exchange(active), error => error.errorCode === ErrorCode.AUTH_TOKEN_INVALID);
    await assert.rejects(bridge[0].exchange({ ...message('ACTIVE'), signature: '0'.repeat(64) }), error => error.errorCode === ErrorCode.AUTH_TOKEN_INVALID);
    await assert.rejects(bridge[0].exchange(message('ACTIVE', Date.now() - 61000)), error => error.errorCode === ErrorCode.AUTH_TOKEN_INVALID);
    groups.push('实际HMAC消息及共享Redis防重放通过，一次并发消费成功；重放、错误签名、过期消息拒绝，无真实运营商调用');
    const applePair = await auth[1].appleLogin({ identityToken: 'ACTIVE' });
    assert.equal(jwt.verify(applePair.accessToken).sub, users.ACTIVE.id); assert.equal(Object.hasOwn(applePair.user, 'status'), false);
    assert.equal((await redis[0].smembers('refresh:user:' + users.ACTIVE.id)).length, 2);
    groups.push('适配验证后的Apple既有身份正确绑定本站用户，实际会话签发正常且公开返回不泄露状态字段');
    const violations = [];
    for (const state of ['BANNED', 'DISABLED']) {
      const actor = users[state], before = (await redis[0].smembers('refresh:user:' + actor.id)).length;
      const phoneBefore = await prisma.auth.count({ where: { userId: actor.id, provider: 'PHONE' } }), imBefore = imCalls;
      for (const [label, call] of [['trusted-phone', () => bridge[1].exchange(message(state))], ['apple-local-identity', () => auth[0].appleLogin({ identityToken: state })]]) {
        const result = await Promise.allSettled([call()]);
        if (result[0].status !== 'rejected' || result[0].reason.errorCode !== ErrorCode.AUTH_USER_BANNED) violations.push(label + ':' + state);
      }
      if ((await redis[1].smembers('refresh:user:' + actor.id)).length !== before) violations.push('refresh-created:' + state);
      if (await prisma.auth.count({ where: { userId: actor.id, provider: 'PHONE' } }) !== phoneBefore) violations.push('phone-identity-created:' + state);
      if (imCalls !== imBefore) violations.push('im-imported:' + state);
    }
    report.accountStateViolations = violations; assert.equal(violations.length, 0, violations.join(', '));
    groups.push('封禁和停用同时拒绝可信手机号及适配Apple身份登录，不签发refresh，不补手机号身份或导入IM');
    const scopes = APP_CHANNELS.filter(channel => channel.id !== 'legacy').flatMap(channel => channel.platforms.map(platform => ({ channelId: channel.id, platform })));
    await prisma.appDistribution.createMany({ data: scopes.map(scope => ({ ...scope, applicationId, productId: applicationId, clientKey: applicationId + '-' + scope.channelId + '-' + scope.platform, packageName: 'cn.rebu.synthetic.trusted', enabled: true, wgtPolicy: 'DENIED' })) });
    assert.equal(await prisma.appDistribution.count({ where: { applicationId, wgtPolicy: 'DENIED' } }), 18);
    Object.assign(report, { passedAll: true, rejectedInactiveLoginBranches: 4, activeRefreshSessions: 2, imAdapterCalls: imCalls, commonStores: 16, deniedScopes: 18, formalCapabilityRegistered: false, cEnabled: false, externalWrites: false });
  } catch (error) { report.passedAll = false; report.failure = error.message; throw error; }
  finally {
    await Promise.all(redis.map(instance => instance.onModuleDestroy())); await prisma.$disconnect(); report.redisAndDatabaseClientsStopped = true;
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
});
