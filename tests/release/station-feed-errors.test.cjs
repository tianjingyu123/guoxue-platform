const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');

function load(apiGet) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync('apps/mobile/src/lib/discover-data.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(js, { exports, require: () => ({ apiGet }) });
  return exports.discoverApi;
}

test('真实聚合内容保留课程古籍，空响应及失败不生成演示内容', async () => {
  const api = load(async () => ({ sections: [
    { type: 'course', items: [{ id: 'course-1', type: 'course', title: '真实课程' }] },
    { type: 'classic', items: [{ id: 'book-1', type: 'classic', title: '真实古籍' }] },
  ] }));
  const items = await api.getPublicFeed();
  assert.deepEqual(Array.from(items, item => item.data.id), ['course-1', 'book-1']);
  assert.equal((await load(async () => ({ sections: [] })).getPublicFeed()).length, 0);
  await assert.rejects(load(async () => { throw new Error('网络失败'); }).getPublicFeed());
});

test('分站能区分请求失败和成功空列表', async () => {
  const failure = new Error('网络不可用');
  const api = load(async () => { throw failure; });
  await assert.rejects(api.getRecommendations({ throwOnError: true }), error => error === failure);
  assert.equal((await api.getRecommendations()).length, 0);
  assert.equal((await load(async () => []).getRecommendations({ throwOnError: true })).length, 0);
});

test('推荐失败后重试可恢复，不缓存失败空结果', async () => {
  let count = 0;
  const api = load(async () => { if (++count === 1) throw new Error('暂时失败'); return []; });
  await assert.rejects(api.getRecommendations({ throwOnError: true }));
  await api.getRecommendations({ throwOnError: true });
  assert.equal(count, 2);
});
