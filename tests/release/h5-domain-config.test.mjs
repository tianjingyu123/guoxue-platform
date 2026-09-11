import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const ts = require('typescript');
function load(path, deps, globals = {}) {
  const source = readFileSync(new URL('../../' + path, import.meta.url), 'utf8').replaceAll('import.meta', 'IMPORT_META');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => deps[name] || {}, URL, process: { env: {} }, IMPORT_META: { env: { BASE_URL: '/h5/' } }, ...globals });
  return module.exports;
}
const env = { PUBLIC_H5_URL: 'https://old.example/h5/', CORS_ORIGIN: 'https://new.example', WECHAT_OAUTH_ALLOWED_ORIGINS: 'https://new.example' };
const resolver = load('apps/server/src/config/h5-entry.ts', { '@nestjs/common': { BadRequestException: Error }, './server-config': { serverConfig: { publicH5Url: env.PUBLIC_H5_URL } } }, { process: { env } });
test('入口规范化，拒绝非HTTPS、外加参数、账号、端口和不匹配路径', () => {
  assert.equal(resolver.normalizeH5Entry(' https://NEW.example/h5 '), 'https://new.example/h5/');
  for (const value of ['http://new.example/h5/', 'https://user@new.example/h5/', 'https://new.example/h5/?token=x', 'https://new.example/h5/#x', 'https://new.example:444/h5/', 'https://new.example/other/']) assert.throws(() => resolver.normalizeH5Entry(value));
});
test('后台只允许选择已登记域名，不能自动扩展权限', () => {
  assert.equal(resolver.validateH5EntrySwitch('https://new.example/h5/'), 'https://new.example/h5/');
  assert.throws(() => resolver.validateH5EntrySwitch('https://unprepared.example/h5/'));
});
test('数据库切换后两次读取立即更新；空值和旧非法配置回退环境值', async () => {
  let value = 'https://new.example/h5/';
  const prisma = { brandConfig: { findUnique: async () => ({ h5Url: value }) } };
  assert.equal(await resolver.getH5Base(prisma), 'https://new.example/h5');
  value = 'https://second.example/h5/';
  assert.equal(await resolver.getH5Base(prisma), 'https://second.example/h5');
  for (value of ['', 'bad']) assert.equal(await resolver.getH5Entry(prisma), env.PUBLIC_H5_URL);
});
test('真实品牌服务保存后即使命中旧缓存仍返回新H5，API域名不变', async () => {
  const { SystemService } = load('apps/server/src/modules/system/system.service.ts', {
    '@nestjs/common': { Injectable: () => x => x, Optional: () => () => {}, Logger: class {} },
    '../../config/h5-entry': resolver,
    '../../config/server-config': { serverConfig: { publicDomain: 'api.example' } },
  });
  let row = { h5Url: 'https://old.example/h5/' }; let writes = 0;
  const prisma = { brandConfig: { findUnique: async () => row, upsert: async ({ update }) => { writes++; row = { ...row, ...update }; return row; } } };
  const redis = { getJson: async () => ({ h5Url: 'https://stale.example/h5/', domain: 'stale.example' }), del: async () => {} };
  const service = new SystemService(prisma, redis); service.getConfig = async () => null;
  await service.updateBrandConfig({ h5Url: 'https://new.example/h5' });
  const cfg = await service.getBrandConfig();
  assert.equal(cfg.h5Url, 'https://new.example/h5/'); assert.equal(cfg.domain, 'api.example');
  await assert.rejects(service.updateBrandConfig({ h5Url: 'https://unprepared.example/h5/' }));
  assert.equal(writes, 1);
});
test('从旧域名分享保留路由和推荐参数，新链接使用后台域名且不导航当前页', () => {
  const window = { location: { href: 'https://old.example/h5/pkg-shop/detail?id=42&ref=abc#section' } };
  const BRAND = { h5Url: 'https://new.example/h5/' };
  const share = load('apps/mobile/src/utils/share.ts', { '@/lib/brand': { BRAND } }, { window });
  assert.equal(share.getCurrentShareUrl(), 'https://new.example/h5/pkg-shop/detail?id=42&ref=abc#section');
  assert.equal(window.location.href, 'https://old.example/h5/pkg-shop/detail?id=42&ref=abc#section');
  BRAND.h5Url = 'https://next.example/h5/';
  assert.equal(share.buildH5Url('/pages/index/index', { ref: '中文 /' }), 'https://next.example/h5/pages/index/index?ref=%E4%B8%AD%E6%96%87%20%2F');
});
test('品牌配置请求合并，30秒内复用，返回前台可更新；失败保留成功配置并允许重试', async () => {
  let now = 100; let calls = 0; let fail = false;
  const apiGet = async () => { calls++; if (fail) throw Error('offline'); return { h5Url: `https://site${calls}.example/h5/` }; };
  const brand = load('apps/mobile/src/lib/brand.ts', { vue: { reactive: x => x }, '@/utils/request': { apiGet } }, { Date: { now: () => now } });
  await Promise.all([brand.hydrateBrandConfig(), brand.hydrateBrandConfig()]); assert.equal(calls, 1);
  await brand.hydrateBrandConfig(); assert.equal(calls, 1);
  now += 31_000; fail = true; await brand.hydrateBrandConfig(); assert.equal(brand.BRAND.h5Url, 'https://site1.example/h5/');
  fail = false; await brand.hydrateBrandConfig(); assert.equal(calls, 3); assert.equal(brand.BRAND.h5Url, 'https://site3.example/h5/');
});
