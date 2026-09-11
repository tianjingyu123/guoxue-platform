/* 在实际应用容器 /app 下运行；只读数据库及配置，不输出密钥、不修改配置。 */
const { createRequire } = require('node:module');
const { resolve } = require('node:path');

async function main() {
  const [target, expectedCurrent] = process.argv.slice(2);
  if (!target || !expectedCurrent) throw new Error('用法：node h5-domain-preflight.cjs <目标H5完整地址> <预期当前H5完整地址>');
  const appRequire = createRequire(resolve(process.cwd(), 'apps/server/package.json'));
  const { PrismaClient } = appRequire('@prisma/client');
  const { normalizeH5Entry, validateH5EntrySwitch, getH5Entry } = require(resolve(process.cwd(), 'apps/server/dist/config/h5-entry.js'));
  const expected = normalizeH5Entry(expectedCurrent);
  const normalized = normalizeH5Entry(target);
  const checks = [];
  try { validateH5EntrySwitch(normalized); checks.push({ name: '目标域名运行配置', ok: true }); }
  catch { checks.push({ name: '目标域名运行配置', ok: false, reason: '检查 CORS_ORIGIN、WS_CORS_ORIGIN、WECHAT_OAUTH_ALLOWED_ORIGINS' }); }
  try { validateH5EntrySwitch(expected); checks.push({ name: '旧域名保留与回退', ok: true }); }
  catch { checks.push({ name: '旧域名保留与回退', ok: false }); }
  const prisma = new PrismaClient();
  try {
    const current = await getH5Entry(prisma);
    checks.push({ name: '数据库入口符合预期', ok: current === expected, current });
  } finally { await prisma.$disconnect(); }
  console.log(JSON.stringify({ target: normalized, checks, externalVerificationRequired: ['HTTPS证书及CLB', '微信校验文件', '公众号授权及JSAPI目录', '真机授权支付退款验收'] }, null, 2));
  if (checks.some(check => !check.ok)) process.exitCode = 1;
}
main().catch(() => { console.error('预检失败：确认在实际应用容器 /app 执行、候选编译文件及数据库连接可用；未执行任何修改。'); process.exitCode = 1; });
