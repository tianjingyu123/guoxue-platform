/** 实际短信验证码消费与本站会话联调；验证码直接写入隔离Redis，不发送短信。 */
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module'), { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const databaseUrl = 'postgresql://channel_test@127.0.0.1:55449/channel_synthetic?schema=channel_auth_phase11';
const redisUrl = 'redis://127.0.0.1:56383/13', enabled = process.env.REBU_CHANNEL_SMS_DATABASE_URL;
if (enabled && (enabled !== databaseUrl || process.env.REBU_CHANNEL_SMS_REDIS_URL !== redisUrl)) throw Error('只允许独立本机测试数据库与Redis');
test('短信验证码一次性消费、实际会话、场景与错误锁定', { skip: !enabled, timeout: 120000 }, async () => {
  const name = process.env.REBU_CHANNEL_SMS_REPORT;
  if (!/^phase16-sms-(debug|fixed|final)-[a-z0-9-]+\.json$/.test(name || '')) throw Error('报告名称超出本阶段范围');
  const output = path.join(root, 'artifacts', name); if (fs.existsSync(output)) throw Error('禁止覆盖原报告');
  const requireServer = createRequire(path.join(root, 'apps/server/package.json'));
  requireServer('reflect-metadata'); requireServer('ts-node').register({ project: path.join(root, 'apps/server/tsconfig.json'), transpileOnly: true });
  const { PrismaClient } = requireServer('@prisma/client'), { JwtService } = requireServer('@nestjs/jwt');
  const load = file => require('../../apps/server/src/' + file + '.ts');
  const { AuthService } = load('modules/auth/auth.service'), { SmsService } = load('modules/sms/sms.service');
  const { RedisService } = load('redis/redis.service'), { buildPhoneFields } = load('common/crypto.util'), { ErrorCode } = load('common/error-codes');
  const names = ['NODE_ENV', 'JWT_SECRET', 'ENCRYPTION_KEY', 'REDIS_URL', 'REDIS_SENTINEL_HOSTS', 'REDIS_SENTINEL_NAME', 'TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_CVM_ROLE_NAME', 'COS_SECRET_ID', 'COS_SECRET_KEY'];
  const saved = Object.fromEntries(names.map(key => [key, process.env[key]])), originalFetch = global.fetch;
  const secret = crypto.randomBytes(64).toString('base64url');
  process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = secret; process.env.ENCRYPTION_KEY = crypto.randomBytes(16).toString('hex'); process.env.REDIS_URL = redisUrl;
  for (const key of names.slice(4)) delete process.env[key];
  let networkCalls = 0, imCalls = 0;
  global.fetch = async () => { networkCalls++; throw Error('本轮禁止外部网络调用'); };
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } }), redis = [new RedisService(), new RedisService()];
  const sms = redis.map(instance => new SmsService(instance, prisma));
  const jwt = new JwtService({ secret, signOptions: { expiresIn: '2h' } }), batch = 'qa-sms-' + crypto.randomUUID().slice(0, 8);
  const unused = new Proxy({}, { get: () => () => { throw Error('本轮禁止外部依赖调用'); } }), im = { importAccount: async () => { imCalls++; } };
  const auth = redis.map((instance, index) => new AuthService(prisma, jwt, instance, unused, unused, im, unused, sms[index], unused, unused));
  const violations = [], groups = [], key = (scene, phone) => `sms:code:${scene}:${phone}`, fail = (scene, phone) => `sms:fail:${scene}:${phone}`;
  const report = { verifiedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), sourceDirty: Boolean(execFileSync('git', ['status', '--porcelain', '--', 'apps', 'packages', 'scripts', 'tests'], { cwd: root, encoding: 'utf8' }).trim()), batch, groups, violations, actualSmsService: true, actualAuthService: true, actualRedisInstances: 2, sameProcess: true, syntheticOnly: true, codeSource: '直接写入隔离Redis的合成验证码', genuineSmsDeliveryVerified: false, httpControllerTested: false, imAdapter: '本地计数', keysOrTokensRecorded: false };
  const rejectedAs = (result, errorCode) => result.status === 'rejected' && result.reason.errorCode === errorCode;
  try {
    const [identity] = await prisma.$queryRawUnsafe('SELECT current_database() AS db, current_user AS actor, inet_server_port() AS port, current_schema() AS schema');
    assert.deepEqual(identity, { db: 'channel_synthetic', actor: 'channel_test', port: 55449, schema: 'channel_auth_phase11' }); report.database = identity;
    await Promise.all(redis.map(instance => instance.pingShared())); assert.ok(redis.every(instance => instance.getClient()));
    const info = await redis[0].getClient().info('server'); report.redis = { host: '127.0.0.1', port: 56383, db: 13, version: info.match(/^redis_version:(.+)$/m)[1].trim(), memoryFallbackUsed: false };
    const oncePhone = batch + '-once'; await redis[0].set(key('LOGIN', oncePhone), '123456', 60);
    const race = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => sms[index % 2].verifyCode(oncePhone, '123456')));
    report.concurrentCodeSuccesses = race.filter(value => value.status === 'fulfilled').length;
    report.concurrentCodeExpired = race.filter(value => rejectedAs(value, ErrorCode.AUTH_SMS_CODE_EXPIRED)).length;
    if (report.concurrentCodeSuccesses !== 1 || report.concurrentCodeExpired !== 9) violations.push('同一验证码并发消费不是一成功九过期');
    await assert.rejects(sms[0].verifyCode(oncePhone, '123456'), error => error.errorCode === ErrorCode.AUTH_SMS_CODE_EXPIRED);
    groups.push('两个实际服务实例十个自然并发请求及后续重放');
    const actor = { id: crypto.randomUUID(), phone: batch + '-login' };
    await prisma.user.create({ data: { id: actor.id, nickname: '独立合成短信账号', status: 'ACTIVE', ...buildPhoneFields(actor.phone) } });
    await redis[0].set(key('LOGIN', actor.phone), '234567', 60);
    const loginRace = await Promise.allSettled(auth.map(instance => instance.smsLogin({ phone: actor.phone, code: '234567' })));
    const winners = loginRace.filter(value => value.status === 'fulfilled'); report.concurrentLoginSuccesses = winners.length;
    for (const winner of winners) assert.equal(jwt.verify(winner.value.accessToken).sub, actor.id);
    report.refreshSessions = (await redis[0].smembers('refresh:user:' + actor.id)).length;
    report.phoneIdentities = await prisma.auth.count({ where: { userId: actor.id, provider: 'PHONE' } });
    if (winners.length !== 1 || report.refreshSessions !== 1 || !loginRace.some(value => rejectedAs(value, ErrorCode.AUTH_SMS_CODE_EXPIRED))) violations.push('实际短信登录产生多个成功或会话');
    await assert.rejects(auth[1].smsLogin({ phone: actor.phone, code: '234567' }), error => error.errorCode === ErrorCode.AUTH_SMS_CODE_EXPIRED);
    groups.push('真实数据库账号、实际短信登录及JWT/refresh会话，IM明确适配');
    const wrongPhone = batch + '-wrong';
    for (let attempt = 1; attempt <= 5; attempt++) {
      await redis[0].set(key('LOGIN', wrongPhone), '345678', 60);
      await assert.rejects(sms[attempt % 2].verifyCode(wrongPhone, '000000'), error => error.errorCode === ErrorCode.AUTH_SMS_CODE_INVALID);
      assert.equal(await redis[0].get(fail('LOGIN', wrongPhone)), String(attempt)); assert.equal(await redis[0].get(key('LOGIN', wrongPhone)), null);
    }
    await redis[0].set(key('LOGIN', wrongPhone), '345678', 60);
    await assert.rejects(sms[0].verifyCode(wrongPhone, '345678'), /30分钟/);
    assert.equal(await redis[1].get(key('LOGIN', wrongPhone)), '345678');
    const lockTtl = await redis[0].ttl(fail('LOGIN', wrongPhone)); assert.ok(lockTtl > 1700 && lockTtl <= 1800); report.lockTtlWithinThirtyMinutes = true;
    groups.push('重发夹具后五次错误累计，锁定保留待验验证码且TTL为30分钟窗口');
    const scenePhone = batch + '-scene';
    await redis[0].set(key('RESET_PASSWORD', scenePhone), '456789', 60);
    await assert.rejects(sms[0].verifyCode(scenePhone, '456789', 'login'), error => error.errorCode === ErrorCode.AUTH_SMS_CODE_EXPIRED);
    assert.equal(await redis[0].get(key('RESET_PASSWORD', scenePhone)), '456789');
    await redis[0].set(fail('RESET_PASSWORD', scenePhone), '2', 1800);
    assert.equal(await sms[1].verifyCode(scenePhone, '456789', 'reset_password'), true);
    assert.equal(await redis[0].get(fail('RESET_PASSWORD', scenePhone)), null);
    const expiredPhone = batch + '-expired'; await redis[0].set(key('LOGIN', expiredPhone), '567890', 60);
    await redis[0].getClient().pexpire(key('LOGIN', expiredPhone), 1);
    await new Promise(resolve => setTimeout(resolve, 20));
    await assert.rejects(sms[0].verifyCode(expiredPhone, '567890'), error => error.errorCode === ErrorCode.AUTH_SMS_CODE_EXPIRED);
    assert.equal(await redis[0].get(fail('LOGIN', expiredPhone)), null);
    groups.push('场景隔离、大小写归一、成功清除失败计数及实际Redis过期');
    report.imAdapterCalls = imCalls; report.networkCalls = networkCalls; assert.equal(networkCalls, 0);
    assert.equal(violations.length, 0, violations.join('；')); report.passedAll = true;
  } catch (error) { report.passedAll = false; report.failure = error.message; throw error; }
  finally {
    await Promise.all(redis.map(instance => instance.onModuleDestroy())); await prisma.$disconnect(); report.redisAndDatabaseClientsStopped = true;
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
});
