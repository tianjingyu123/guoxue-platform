import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { schemaFingerprint, inspectPrismaBuild, assertReceipt } from "../../scripts/release/verify-prisma-build.mjs";

const schema = 'model User {\n id String @id\n name String @default("a b//c")\n}';
test("schema允许格式和注释变化，但字符串、字段和词元边界不能变化", () => {
  assert.equal(schemaFingerprint(schema), schemaFingerprint(`// 注释\r\n${schema.replaceAll(" ", "  ").replace('"a  b//c"', '"a b//c"')}\n/* 注释 */`));
  for (const changed of [schema.replace("name", "other"), schema.replace("a b", "ab"), schema.replace("String", "Str ing"), schema.replace("name String", "name String?")]) {
    assert.notEqual(schemaFingerprint(schema), schemaFingerprint(changed));
  }
});

function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "rebu-prisma-binding-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const put = (name, value) => { const file = path.join(dir, name); mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, value); };
  put("package.json", "{}");
  put("prisma/schema.prisma", schema);
  put("node_modules/@prisma/client/package.json", '{"version":"6.19.3","main":"index.js"}');
  put("node_modules/@prisma/client/index.js", 'module.exports=require(".prisma/client/default")');
  put("node_modules/.prisma/client/default.js", 'exports.Prisma={prismaVersion:{client:"6.19.3"}}');
  put("node_modules/.prisma/client/schema.prisma", schema);
  put("node_modules/prisma/package.json", '{"version":"6.19.3"}');
  return { dir, put };
}

test("真实模块解析从包装包找到生成客户端，并可复验编译绑定", (t) => {
  const { dir } = fixture(t); const receipt = inspectPrismaBuild(dir);
  assertReceipt(inspectPrismaBuild(dir), receipt);
  assert.equal(receipt.clientVersion, "6.19.3");
});
test("旧生成schema被拒绝", (t) => {
  const { dir, put } = fixture(t); put("node_modules/.prisma/client/schema.prisma", schema.replace("name", "oldName"));
  assert.throws(() => inspectPrismaBuild(dir), /schema不一致/);
});
test("生成版本与依赖版本错配被拒绝", (t) => {
  const { dir, put } = fixture(t); put("node_modules/.prisma/client/default.js", 'exports.Prisma={prismaVersion:{client:"6.18.0"}}');
  assert.throws(() => inspectPrismaBuild(dir), /版本不一致/);
});
test("编译后即使同步替换schema与客户端也不能冒用旧绑定", (t) => {
  const { dir, put } = fixture(t); const before = inspectPrismaBuild(dir);
  put("prisma/schema.prisma", schema.replace("name", "other")); put("node_modules/.prisma/client/schema.prisma", schema.replace("name", "other"));
  assert.throws(() => assertReceipt(inspectPrismaBuild(dir), before), /绑定记录不一致/);
});
