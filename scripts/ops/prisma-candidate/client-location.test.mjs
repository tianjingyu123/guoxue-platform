import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { isLocalClient } from "./client-location.mjs";

const root = resolve("isolated-worktree");
const local = resolve(root, "node_modules/client/default.js");
const generated = resolve(root, "node_modules/.prisma/client/default.js");
const external = resolve(root, "../main/node_modules/client/default.js");

test("包和生成物均在本工作树内才独立", () => {
  assert.equal(isLocalClient(root, local, generated), true);
});
test("本地包壳不能掩盖外部生成物", () => {
  assert.equal(isLocalClient(root, local, external), false);
});
test("共享包链接不算全独立", () => {
  assert.equal(isLocalClient(root, external, generated), false);
});
test("名称同前缀的相邻目录不能冒充工作树子目录", () => {
  assert.equal(isLocalClient(root, `${root}-other/client.js`, generated), false);
});
