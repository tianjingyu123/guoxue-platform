const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const source = fs.readFileSync('apps/server/src/modules/classic/classic-companion.service.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
const moduleStub = { exports: {} };
vm.runInNewContext(compiled, { exports: moduleStub.exports, require: () => ({ Injectable: () => x => x, Logger: class {}, NotFoundException: Error, ServiceUnavailableException: Error }), console });
const Service = moduleStub.exports.ClassicCompanionService;
function fixture(gateway) {
  let writes = 0;
  const db = {
    classicChapter: { findUnique: async () => ({ title: '第二章', content: '第二章原文', bookId: 'book', book: { title: '测试书' } }) },
    classicCompanionSession: { upsert: async () => ({ id: 'session', summary: null, messageCount: 0 }) },
    classicCompanionMessage: { findMany: async () => [{ role: 'assistant', content: '第一章回答', chapterId: 'first' }] },
    $transaction: async () => { writes++; },
  };
  return { service: new Service(db, gateway), writes: () => writes };
}
test('当前章节与其他章节历史具有不同上下文标记', async () => {
  const { service } = fixture({});
  const { messages } = await service.prepareContext({ chapterId: 'second', question: '总结本章' }, 'user');
  assert.ok(messages.some(m => m.content.includes('第二章原文')));
  assert.ok(messages.some(m => m.content.includes('其他章节历史讨论，仅供参考') && m.content.includes('第一章回答')));
});
test('空的普通回答报错且不持久化为成功对话', async () => {
  const f = fixture({ chat: async () => ({ content: '  ' }) });
  await assert.rejects(f.service.chat({ chapterId: 'second', question: '总结' }, 'user'), /未返回内容/);
  assert.equal(f.writes(), 0);
});
test('空的流式回答报错且不持久化', async () => {
  const f = fixture({ chatStream: async function* () { yield ' '; } });
  await assert.rejects(async () => { for await (const chunk of f.service.chatStream({ chapterId: 'second', question: '总结' }, 'user')) {} }, /未返回内容/);
  assert.equal(f.writes(), 0);
});
