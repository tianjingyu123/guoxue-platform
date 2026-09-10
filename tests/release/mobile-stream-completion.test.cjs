const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('node:module').createRequire(require('node:path').resolve('apps/mobile/package.json'))('typescript');
const source = fs.readFileSync('apps/mobile/src/utils/stream-chat.ts', 'utf8')
  .replace(/\/\/ #ifndef H5[\s\S]*?\/\/ #endif/g, '')
  .replace('(import.meta as any).env?.VITE_API_URL', "''");
function load(parts) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: () => ({ getToken: () => '' }), TextDecoder, ReadableStream,
    fetch: async () => new Response(new ReadableStream({ start(c) { for (const p of parts) c.enqueue(new TextEncoder().encode(p)); c.close(); } })),
  });
  return exports.streamChat;
}
test('分块结束标记允许完成且保留文字', async () => {
  let text = '';
  await load(['data: {"type":"chunk","content":"正文"}\n', 'data: {"type":"do', 'ne"}'])('/test', {}, { onChunk: t => text += t });
  assert.equal(text, '正文');
});
test('收到部分正文但没有完成标记应报传输中断', async () => {
  await assert.rejects(load(['data: {"type":"chunk","content":"部分"}\n'])('/test', {}, { onChunk() {} }), /传输中断/);
});
test('服务端错误不能被完成标记掩盖', async () => {
  await assert.rejects(load(['data: {"type":"error","message":"生成失败"}\ndata: {"type":"done"}\n'])('/test', {}, { onChunk() {} }), /生成失败/);
});
