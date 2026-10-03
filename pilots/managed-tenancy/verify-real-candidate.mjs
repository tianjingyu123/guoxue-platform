import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assertFresh } from '../../scripts/ops/prisma-candidate/client.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(process.argv[2] || resolve(repo, 'pilots/managed-tenancy/.runtime/final-evidence'));
const runtime = resolve(repo, 'pilots/managed-tenancy/.runtime/final-logs');
mkdirSync(output, { recursive: true }); mkdirSync(runtime, { recursive: true });
const sha = path => createHash('sha256').update(readFileSync(resolve(repo, path))).digest('hex');
const walk = path => readdirSync(resolve(repo, path), { withFileTypes: true }).flatMap(item => item.isDirectory() ? (item.name === '.runtime' ? [] : walk(`${path}/${item.name}`)) : [`${path}/${item.name}`]);
const files = [...walk('apps/mobile/managed'), 'apps/mobile/src/lib/managed-brand.ts', 'apps/mobile/src/pkg-workspace/managed-store/index.vue', 'apps/mobile/src/pages/index/index.vue', 'apps/mobile/src/pages.json', 'apps/mobile/tsconfig.managed.json','apps/mobile/tsconfig.managed-brand.json','apps/mobile/vite.managed.config.ts','scripts/ops/managed-client-build.mjs','scripts/ops/managed-brand-client-build.mjs','scripts/ops/managed-exit-verify.mjs', ...['12_managed_local_content','13_managed_limits_fence','14_managed_brand_course'].map(name=>`apps/server/prisma/migrations/manual_z_20261003_${name}/migration.sql`), 'apps/server/src/modules/course/course-purchase.service.ts','apps/server/src/modules/course/course-learning.service.ts','apps/server/src/modules/course/course.module.ts','apps/server/src/modules/shop/shop-order-lifecycle.service.ts','apps/server/src/modules/shop/shop-coupon.service.ts','apps/server/src/modules/shop/shop.module.ts', ...walk('apps/server/src/modules/managed-tenancy'), ...walk('pilots/managed-tenancy'), ...['07_managed_customer_control', '08_managed_lease_exit', '09_managed_brand_order', '10_managed_lease_identity', '11_managed_recovery_export'].map(name => `apps/server/prisma/migrations/manual_z_20261002_${name}/migration.sql`), 'apps/server/prisma/migrations-deploy/full-baseline.sql', 'apps/server/prisma/migrations-deploy/circle-reward-snapshot.sql', 'apps/server/prisma/migrations/manual_z_20261002_07_circle_post_reward_notice_snapshot/migration.sql', 'scripts/ops/prisma-candidate/managed-control-scope.mjs', 'apps/server/src/lease-main.ts', 'apps/server/prisma/schema.prisma', 'apps/server/src/app.module.ts', 'apps/server/package.json', 'apps/server/src/modules/auth/auth.service.ts', 'apps/server/src/modules/auth/auth.service.spec.ts', 'apps/admin/src/api/managed-tenancy.ts', 'apps/admin/src/views/tenant/ManagedCustomerList.vue', 'apps/admin/src/router/index.ts', 'apps/admin/src/lib/menu-structure.ts', 'packages/shared/src/client-presentation.ts', 'apps/server/src/modules/feature-flag/client-presentation.service.ts', 'apps/server/src/modules/feature-flag/feature-flag.service.ts', 'apps/server/src/modules/system/distribution.service.ts', 'apps/server/src/modules/shop/shop-order.service.ts', 'apps/server/src/modules/shop/shop-attribution.service.ts', 'apps/server/src/modules/pricing/unified-pricing.service.ts', 'apps/server/src/modules/commission/commission.service.ts'];
files.push('packages/shared/src/app-channels.ts', 'apps/server/src/modules/ai-gateway/adapters/base.adapter.ts', 'apps/server/src/modules/ai-gateway/adapters/qwen.adapter.ts', 'apps/server/src/modules/ai-gateway/adapters/bounded-response.ts', 'scripts/ops/prisma-candidate/managed-provider-probe.mjs');
const before = Object.fromEntries(files.map(path => [path, sha(path)]));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const client = assertFresh();
const checks = [];
// 同一控制库的写测试串行执行，避免多个测试同时改急停/品牌配置。
const suites = ['control','lease','local-auth','learning','content','circle','commerce','chat','limits','fence','exit','brand','brand-course','presentation','layout-client','backup','cutover','schema','control-scope','shutdown','provider-boundary','chat-budget','proxy','virtual-pilot'];
for (const name of [...suites,'provider-registration','provider-response','native-commerce','bootstrap','auth','sqlite','isolation']) {
  const reportPath = resolve(output, `${name}-20261003.json`);
  let args;
  if (name === 'bootstrap') args = ['pilots/managed-tenancy/verify-bootstrap-postgres.mjs', '--compiled'];
  else if (name === 'provider-registration') args=['pilots/managed-tenancy/verify-provider-registration.mjs',reportPath];
  else if (name === 'provider-response') args=['pilots/managed-tenancy/verify-provider-response.mjs',reportPath];
  else if(name==='native-commerce') args=['pilots/managed-tenancy/verify-native-commerce-regression.mjs',reportPath];
  else if (name === 'auth') args = ['pilots/managed-tenancy/verify-auth-regression.mjs', reportPath];
  else if (name === 'sqlite') args = ['pilots/managed-tenancy/verify.mjs', reportPath];
  else if (name === 'isolation') args = ['scripts/ops/prisma-candidate/assert-isolation.mjs'];
  else args = [`pilots/managed-tenancy/verify-${name}-postgres.mjs`, reportPath];
  const run = spawnSync(process.execPath, args, { cwd: repo, encoding: 'utf8', windowsHide: true, timeout: name==='cutover'?600000:180000, maxBuffer: 8 * 1024 * 1024 });
  writeFileSync(resolve(runtime, `${name}.log`), (run.stdout || '') + (run.stderr || ''));
  if (run.status !== 0 || run.error) { console.error(`${name}验证失败，诊断保留在本任务忽略目录`); process.exit(1); }
  if (name === 'bootstrap') writeFileSync(reportPath, readFileSync(resolve(repo, 'pilots/managed-tenancy/.runtime/bootstrap-compiled-postgres.json')));
  const report = name === 'isolation' ? { passed: 11, failed: 0 } : JSON.parse(readFileSync(reportPath, 'utf8'));
  if (name === 'isolation') {
    if (!/11 通过 \/ 0 失败/.test(run.stdout)) throw new Error('候选隔离断言数量或结果已变化，请更新证据解析');
    writeFileSync(reportPath, JSON.stringify({ head, node: process.version, passed: 11, failed: 0, production: false, outputSha256: createHash('sha256').update(run.stdout).digest('hex'), limits: ['客户端隔离断言，不连接生产'] }, null, 2) + '\n');
  }
  if (report.failed !== 0) throw new Error(`${name}报告存在失败`);
  checks.push({ name, passed: report.passed, failed: report.failed, report: `${name}-20261003.json`, reportSha256: createHash('sha256').update(readFileSync(reportPath)).digest('hex') });
  console.log(JSON.stringify({ suite: name, passed: report.passed, failed: report.failed }));
}
const after = Object.fromEntries(files.map(path => [path, sha(path)]));
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('验证期间源码发生变化，证据不能归档');
const compiledFiles=walk('apps/server/.prisma-candidate/server-build').filter(path=>path.endsWith('.js'));
compiledFiles.push(...walk('packages/shared/dist').filter(path=>path.endsWith('.js')));
const gitSources=Object.fromEntries(files.map(path=>{const blob=execFileSync('git',['show','HEAD:'+path],{cwd:repo,maxBuffer:16*1024*1024});const current=readFileSync(resolve(repo,path),'utf8').replaceAll('\r\n','\n');if(current!==blob.toString('utf8').replaceAll('\r\n','\n'))throw new Error('待归档源码不是本提交：'+path);return [path,createHash('sha256').update(blob).digest('hex')]}));
const manifest = { gitSources,compiled:Object.fromEntries(compiledFiles.map(path=>[path,sha(path)])), generatedAt: new Date().toISOString(), head, baseline: '910806b8e72b7259b6b8011604d3e23413ae93fd', node: process.version, schemaSha256: client.schemaSha256, compiledLeaseMainSha256: sha('apps/server/.prisma-candidate/server-build/lease-main.js'), sources: before, checks, production: false, limits: ['同一Windows主机、本任务合成PostgreSQL/SQLite数据', '本清单不包含真实Redis、队列、COS、向量库、商户或真机渠道验收', '服务端是专用候选客户端的完整TypeScript编译，独立启动验收；不是正式镜像或全AppModule运行验收','客户端构建和页面QA另行归档；本清单不将编译资源当成真机或商店验收'] };
writeFileSync(resolve(output, 'manifest-20261003.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ suites: checks.length, failed: 0, manifest: resolve(output, 'manifest-20261003.json') }));
