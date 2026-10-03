import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("排盘首页所有工具都映射到真实页面或明确的开发中页", () => {
  const toolSource = read("apps/mobile/src/lib/tools-data.ts");
  const routerSource = read("apps/mobile/src/utils/router.ts");
  const routeMap = new Map(
    [...routerSource.matchAll(/['"](\/[^'"]+)['"]\s*:\s*['"](\/[^'"]+)['"]/gu)].map(
      ([, from, to]) => [from, to],
    ),
  );
  const entries = [...toolSource.matchAll(/\{\s*id:\s*'([^']+)'[\s\S]*?href:\s*'([^']+)'[\s\S]*?\}/gu)]
    .map(([block, id, href]) => ({ id, href, comingSoon: /comingSoon:\s*true/u.test(block) }));

  assert.ok(entries.length >= 40, `排盘工具解析数量异常：${entries.length}`);
  for (const tool of entries) {
    const route = tool.href.split("?")[0];
    const target = routeMap.get(route);
    assert.ok(target, `${tool.id} 缺少路由映射：${route}`);
    const pageFile = path.join(root, "apps/mobile/src", `${target.slice(1)}.vue`);
    assert.ok(existsSync(pageFile), `${tool.id} 路由目标不存在：${target}`);
    if (tool.comingSoon) {
      assert.match(target, /coming-soon/u, `${tool.id} 标记开发中却跳入正式工具页`);
    }
  }
});
