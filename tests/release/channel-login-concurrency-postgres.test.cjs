/** 两个真实服务实例并发密码失败、账号锁与窗口恢复；仅允许独立合成环境。 */
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const databaseUrl = 'postgresql://channel_test@127.0.0.1:55449/channel_synthetic?schema=channel_auth_phase11';
const redisUrl = 'redis://127.0.0.1:56381/13', enabled = process.env.REBU_CHANNEL_CONCURRENCY_DATABASE_URL;
if (enabled && (enabled !== databaseUrl || process.env.REBU_CHANNEL_CONCURRENCY_REDIS_URL !== redisUrl)) throw Error('仅允许本机独立数据库及Redis');
test('十次并发密码失败完整计数、跨实例账号锁及滚动窗口恢复', { skip: !enabled, timeout: 120000 }, async () => {
  const reportName = process.env.REBU_CHANNEL_CONCURRENCY_REPORT;
  if (!/^phase14-concurrency-(debug|fixed|final)-[a-z0-9-]+\.json$/.test(reportName || '')) throw Error('报告名称不在本阶段范围');
  const output = path.join(root, 'artifacts', reportName); if (fs.existsSync(output)) throw Error('不覆盖已有报告');
  const requireServer = createRequire(path.join(root, 'apps/server/package.json'));
  requireServer('reflect-metadata'); requireServer('ts-node').register({ project: path.join(root, 'apps/server/tsconfig.json'), transpileOnly: true });
  const { PrismaClient } = requireServer('@prisma/client'), { JwtService } = requireServer('@nestjs/jwt'), bcrypt = requireServer('bcryptjs');
  const { AuthService } = require('../../apps/server/src/modules/auth/auth.service.ts');
  const { RedisService } = require('../../apps/server/src/redis/redis.service.ts');
  const { buildPhoneFields } = require('../../apps/server/src/common/crypto.util.ts');
  const { ErrorCode } = require('../../apps/server/src/common/error-codes.ts');
  const envNames = ['NODE_ENV', 'JWT_SECRET', 'ENCRYPTION_KEY', 'REDIS_URL', 'REDIS_SENTINEL_HOSTS', 'REDIS_SENTINEL_NAME'];
  const saved = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  const secret = crypto.randomBytes(64).toString('base64url'), password = 'Qa9-' + crypto.randomBytes(16).toString('hex');
  process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = secret; process.env.ENCRYPTION_KEY = crypto.randomBytes(16).toString('hex');
  process.env.REDIS_URL = redisUrl; delete process.env.REDIS_SENTINEL_HOSTS; delete process.env.REDIS_SENTINEL_NAME;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const redis = [new RedisService(), new RedisService()], groups = [];
  const unused = new Proxy({}, { get: () => () => { throw Error('本轮禁止调用外部依赖'); } });
  let imAdapterCalls = 0;
  const imAdapter = { importAccount: async () => { imAdapterCalls++; } };
  const jwt = new JwtService({ secret, signOptions: { expiresIn: '2h' } });
  const auth = redis.map(instance => new AuthService(prisma, jwt, instance, unused, unused, imAdapter, unused, unused, unused, unused));
  const applicationId = 'qa-concurrent-' + crypto.randomUUID().slice(0, 8);
  const report = { verifiedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts', 'tests'], { cwd: root, encoding: 'utf8' }).trim()), syntheticOnly: true, applicationId, realAuthService: true, realBcrypt: true, realRedisServiceInstances: 2, realPostgres: true, httpControllerTested: false, groups, passwordAndKeysRecorded: false, imAdapter: '本地计数' };
  try {
    const [identity] = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS actor, inet_server_port() AS port, current_schema() AS schema');
    assert.deepEqual(identity, { db: 'channel_synthetic', actor: 'channel_test', port: 55449, schema: 'channel_auth_phase11' }); report.database = identity;
    await Promise.all(redis.map(instance => instance.pingShared())); assert.ok(redis.every(instance => instance.getClient()));
    const info = await redis[0].getClient().info('server'); report.redis = { host: '127.0.0.1', port: 56381, db: 13, version: info.match(/^redis_version:(.+)$/m)[1].trim(), memoryFallbackUsed: false };
    const credential = await bcrypt.hash(password, 10), users = [];
    for (const kind of ['target', 'other', 'rolling']) {
      const id = crypto.randomUUID(), phone = applicationId + '-' + kind;
      await prisma.user.create({ data: { id, nickname: '独立并发登录合成账号', ...buildPhoneFields(phone), auths: { create: { provider: 'PASSWORD', namespace: 'password', subject: id, credential } } } }); users.push({ id, phone });
    }
    const target = users[0], failKey = 'login:fail:' + target.phone, lockKey = 'login:lock:' + target.phone;
    // 不替换get/set、不设读写屏障；直接运行真实密码服务和Redis操作的自然并发。
    const requests = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => auth[index % 2].phoneLogin({ phone: target.phone, password: 'wrong-password' })));
    report.concurrentRequests = 10; report.rejectedPasswordRequests = requests.filter(result => result.status === 'rejected' && result.reason.errorCode === ErrorCode.AUTH_PASSWORD_WRONG).length;
    report.actualFailureCount = Number(await redis[1].get(failKey)); report.accountLocked = Boolean(await redis[1].get(lockKey));
    assert.equal(report.rejectedPasswordRequests, 10); assert.equal(report.actualFailureCount, 10); assert.equal(report.accountLocked, true);
    assert.ok(await redis[1].getClient().ttl(lockKey) >= 890); assert.ok(await redis[1].getClient().ttl(failKey) >= 890);
    for (const instance of auth) await assert.rejects(instance.phoneLogin({ phone: target.phone, password }), error => error.errorCode === ErrorCode.AUTH_PASSWORD_WRONG);
    assert.equal((await redis[1].smembers('refresh:user:' + target.id)).length, 0); assert.equal(imAdapterCalls, 0);
    groups.push('十次自然并发错误密码全部计数，两个实例拒绝被锁账号正确密码，不创建会话或触发IM');
    const otherPair = await auth[1].phoneLogin({ phone: users[1].phone, password }); assert.equal(jwt.verify(otherPair.accessToken).sub, users[1].id);
    assert.equal(await redis[1].get('login:lock:' + users[1].phone), null);
    // 只缩短本轮目标账号夹具TTL，以验证真实Redis到期恢复；不声称等待了15分钟。
    await redis[0].expire(failKey, 1); await redis[0].expire(lockKey, 1);
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(await redis[1].get(lockKey), null);
    const recovered = await auth[1].phoneLogin({ phone: target.phone, password }); assert.equal(jwt.verify(recovered.accessToken).sub, target.id);
    assert.equal(await redis[1].get(failKey), null);
    groups.push('其他账号不受锁影响；本轮夹具TTL缩短后真实到期，被锁账号恢复登录并清除失败计数');
    const rolling = users[2], rollingKey = 'login:fail:' + rolling.phone;
    for (let index = 0; index < 3; index++) await assert.rejects(auth[index % 2].phoneLogin({ phone: rolling.phone, password: 'wrong-password' }));
    assert.equal(await redis[0].get(rollingKey), '3'); await redis[0].expire(rollingKey, 1);
    await assert.rejects(auth[1].phoneLogin({ phone: rolling.phone, password: 'wrong-password' }));
    assert.equal(await redis[0].get(rollingKey), '4'); assert.ok(await redis[0].getClient().ttl(rollingKey) >= 890);
    await auth[0].phoneLogin({ phone: rolling.phone, password }); assert.equal(await redis[1].get(rollingKey), null);
    groups.push('每次失败刷新15分钟滚动TTL且保留累计次数，成功密码登录清除当前账号失败计数');
    Object.assign(report, { passedAll: true, recoveredAccounts: 1, successfulAccounts: 3, imAdapterCalls, externalWrites: false, formalLoginTested: false, cEnabled: false });
  } catch (error) { report.passedAll = false; report.failure = error.message; throw error; }
  finally {
    await Promise.all(redis.map(instance => instance.onModuleDestroy())); await prisma.$disconnect(); report.redisAndDatabaseClientsStopped = true;
    for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
});
