const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const path = require("node:path");
const ts = require("node:module").createRequire(path.resolve("apps/mobile/package.json"))(
  "typescript",
);
const source = fs.readFileSync("apps/mobile/src/pkg-circle/circles/editor.vue", "utf8");
const actual = source.match(/async function refreshRole\([^]*?\n\}/)?.[0];
assert.ok(actual, "需验证编辑器真实权限方法");
const compiled = ts.transpileModule(actual, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture() {
  const pending = new Map();
  const state = {
    roleRequest: 0,
    roleLoaded: { value: false },
    myRole: { value: null },
    type: { value: "article" },
    draftStatus: { value: "原草稿" },
    circleDetailApi: {
      getJoinStatus: (id) => new Promise((resolve, reject) => pending.set(id, { resolve, reject })),
    },
  };
  state.canPublishArticle = {
    get value() {
      return ["OWNER", "PARTNER", "ADMIN"].includes(state.myRole.value);
    },
  };
  const context = vm.createContext(state);
  vm.runInContext(compiled, context);
  return { state, pending, refresh: (id) => context.refreshRole(id) };
}

test("切换圈子后旧权限成功响应不能结束新请求的加载状态", async () => {
  const f = fixture();
  const old = f.refresh("old");
  const current = f.refresh("current");
  f.pending.get("old").resolve({ role: "OWNER" });
  await old;
  assert.equal(f.state.roleLoaded.value, false);
  assert.equal(f.state.myRole.value, null);
  f.pending.get("current").resolve({ role: "MEMBER" });
  await current;
  assert.equal(f.state.roleLoaded.value, true);
  assert.equal(f.state.myRole.value, "MEMBER");
  assert.equal(f.state.type.value, "post");
});

test("旧请求迟到失败不能覆盖新圈子已取得的管理员权限与草稿状态", async () => {
  const f = fixture();
  const old = f.refresh("old");
  const current = f.refresh("current");
  f.pending.get("current").resolve({ role: "OWNER" });
  await current;
  f.pending.get("old").reject(Error("隔离旧请求失败"));
  await old;
  assert.equal(f.state.myRole.value, "OWNER");
  assert.equal(f.state.roleLoaded.value, true);
  assert.equal(f.state.type.value, "article");
  assert.equal(f.state.draftStatus.value, "原草稿");
});

test("当前权限查询失败不保留旧圈子权限并提示保留草稿", async () => {
  const f = fixture();
  f.state.myRole.value = "OWNER";
  const current = f.refresh("current");
  assert.equal(f.state.myRole.value, null);
  f.pending.get("current").reject(Error("隔离当前请求失败"));
  await current;
  assert.equal(f.state.roleLoaded.value, true);
  assert.equal(f.state.canPublishArticle.value, false);
  assert.equal(f.state.draftStatus.value, "暂时无法确认创作权限，请保留草稿后重试");
});

test("取消圈子选择后旧请求不能恢复创作权限", async () => {
  const f = fixture();
  const old = f.refresh("old");
  await f.refresh(null);
  f.pending.get("old").resolve({ role: "OWNER" });
  await old;
  assert.equal(f.state.myRole.value, null);
  assert.equal(f.state.roleLoaded.value, true);
});
