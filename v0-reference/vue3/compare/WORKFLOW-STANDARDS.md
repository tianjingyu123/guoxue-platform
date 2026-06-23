# 工作规范与标准（WORKFLOW-STANDARDS）

> ⚠️ **给接手的新 v0 账号**：这份文件是原 v0 账号「记忆系统」内容的可下载副本。
> v0 的记忆（`v0_memories/`）跟随**原用户账号**持久化，**不随项目 ZIP 下载**，新账号无法自动继承。
> 因此把全部工作规范、铁律、技术经验固化在此文件中。**开工前务必先通读本文件 + `HANDOFF.md` + `route-map.json`。**

---

# 原型→uni-app(vue3) H5 迁移工作流

项目：把 Next.js 原型（`app/**` 或 `proto-ref-app/**`）逐页 1:1 高保真迁移到 uni-app(vue3) H5（`vue3/src/**`）。

## 铁律
- **唯一真源是原型**：照抄其结构/配色/文案/**数据**，不自由发挥。
- **数据必须逐字段照搬原型 mock**：禁止凭感觉填价格/时间/距离/统计数。封面/头像原型用 placeholder，迁移时用空值 + 灰底 `#E5E5E5` 占位匹配。
- **跳转统一走 `vue3/src/utils/router.ts`**：ROUTE_MAP（静态路径）/ DYNAMIC_ROUTES（含 `:id` 动态段，正则）。新增页后三处注册：`pages.json`（分包）+ 调用方入口 + `compare/route-map.json`（owner/status/note）。

## 质量验证（必做，血的教训）
新建任何有 UI 的页后**必须**：
1. 跑 `cd vue3/compare && node capture-and-diff.mjs --filter=<页名>`（或用 agent-browser 在移动端 512×1107 截图）。
2. **人眼看 `output/*__diff.png` 三联图**（proto / vue / diff），不能只截单图扫一眼。
- diff 脚本 `PASS_RATIO=0.5%` 极严，跨框架页普遍"FAIL"在 4~10%，**百分比要人眼解读**：红色若是全局文字"双影"累积偏移=字体行高差（无害）；若某处大块红=结构性缺陷（必须修）。
- 截图里 SVG 上的蓝色方框是工具 focus 标注，非真实渲染差异，以 diff 图为准。
- 环境重置后 `vue3/node_modules` 与 playwright chromium 会丢，需 `pnpm install` + `npx playwright install chromium` 重装。
- 每页迁完务必跑 `npx vue-tsc --noEmit` 确认零类型错误。

## 断链排查（本项目最高频隐性问题）
页迁好了但调用方路径与映射对不上。方法：`grep navigateTo/go/reLaunch 字面量路径 → 逐一判断 ROUTE_MAP 有 key 或直达 pkg 分包页存在 → 列出无目标者`。暂缓板块的调用 → 降级到 `pkg-paipan/tools/coming-soon` 占位。

## 环境
- uni H5 dev：`cd vue3 && pnpm dev:h5`（VM 里 dev server 由 v0 自动起；端口见 `$DEV_PORT`）。注意：原型若另跑在 3000 端口是 Next.js，`typeof uni` 在那里恒为 undefined。
- uni H5 特性：浏览器直开 hash / reload 会回退首页，验证页面渲染要用 `uni.reLaunch({url})` 或直接 `agent-browser open <url>`。

## 暂缓板块约定（2026-06-22 最新）
- 书院 institute **已全部迁完（14 页）**、线下 offline **正在迁（7/19）**——这两个**不再 skip**。
- 当前仍暂缓：商家 merchant / 视频 video / 赛事 competition / 站长 station / 运营 operator（待用户确认）。
- 原型自身无入口的孤儿页仍跳过。**接手时先向用户确认主线方向，勿擅自开工或擅自 skip。**

## 复杂页迁移技术经验（institute/offline 实战，2026-06-22）
- **取 query 参数**：用 `import { onLoad } from '@dcloudio/uni-app'` 的 `onLoad((q)=>{ const id = q?.id ? Number(q.id) : 数组[0].id })`。**没有 `getRouteQuery` 这个工具，别用**。
- **数据复刻**：把原型 `lib/api/<板块>.ts` 的 mock 逐字段抄进 `vue3/src/lib/<板块>-data.ts`（如 `institute-data.ts` / `offline-data.ts`），页面 import 用。含中文的数据文件用 Edit/Write 时传 `dangerously_disable_autofix:true` 防二次乱码。
- **Math.random 必须替换**：原型若用 `Math.random()` 生成可用性/随机态（如时段表），迁移改**确定性伪随机**（`Math.sin(seed)*10000` 取小数部分），否则每次渲染不同、diff 无法复现。
- **自定义 Tailwind 色 token 转内联 hex**：原型 `gold/operator/success/info` 等非标准 token，统一转 `#d4a017`/`#c41e3a`/`#16a34a`/`#2563eb`。
- **封面/头像占位**：原型 unsplash/placeholder 一律换成米色/灰底 CSS 渐变 + 居中图标，不引外链图。
- **复用页**：原型若某详情页直接复用另一组件（如 institute `members/[id]` 复用 `InstructorDetailPage`），vue 端**路由直接映射到已迁页**，不重复造页。
- **app-icon 尺寸**：`:size` 默认单位 rpx，但 H5 端既有页全用 `:size="20"` 不传 unit 且 diff 通过，照此即可。
- **缺图标**：手动加到 `vue3/src/lib/icons-registry.ts`（`body`/`kind`/`viewBox` 三字段，body 用 lucide 的 path）。本轮已补 `car`/`coffee`/`map`/`calendar-plus`。
- **banner 渐变坑**：原型常用 `from-primary/20`（带透明度的浅色渐变）+ 深色文字，别误做成实色 + 白字（会导致 diff 飙到 30%）。
- **dangerously_disable_autofix**：写含大量中文/特殊字符的文件时，Edit/Write 传 `dangerously_disable_autofix:true`，避免 autofix 把中文转成乱码（U+FFFD）。

## 新增页面的标准三件套注册流程
1. **`vue3/src/pages.json`**：在对应分包（如 `pkg-offline`）的 `pages` 数组加 `{ "path": "<目录>/index", "style": { "navigationStyle": "custom" } }`。
2. **`vue3/src/utils/router.ts`**：
   - 静态路径 → `ROUTE_MAP` 加 `'/offline/orders': '/pkg-offline/orders/index'`。
   - 含 `:id` 动态段 → `DYNAMIC_ROUTES` 加 `[/^\/offline\/orders\/([^/?]+)$/, '/pkg-offline/order-detail/index', 'id']`。
   - ⚠️ 静态路径必须在 ROUTE_MAP 中（优先命中），动态正则才不会误吞 `/create` 等子路径。
3. **`vue3/compare/route-map.json`**：末尾 `pairs` 数组追加 `{ proto, vue, status:"migrate", owner:"V", migratedAt, note }`。note 要写清页面结构 + 数据源 + 特殊处理。

## 配套文档（`vue3/compare/`）
- `route-map.json` —— **唯一权威真源**（每页 owner/status/note/deprecated/supersededBy）。判断某页是否已迁、迁到哪，**一律以此为准，不信过时的文字描述**。
- `HANDOFF.md` —— 交接总入口（含当前进度、立即要做、断点）。
- `WORKFLOW-STANDARDS.md` —— 本文件（工作规范副本）。
- `PENDING-PAGES.md` —— 待迁页清单。
- `DEPRECATED.md` —— 已废弃旧套页清单。
- `capture-and-diff.mjs` —— 截图对比工具（`--filter=` / `--owner=` / `--status=`）。
- `audit-reachability.mjs` —— 可达性排查。
- `audit-status.mjs` / `diag-route.mjs` —— 状态审计 / 单路由诊断。

## 接手第一步建议
1. 通读本文件 + `HANDOFF.md`。
2. `grep -c '"proto":' route-map.json` 看总数，按 `status` 过滤看真实进度。
3. 核磁盘 `vue3/src/pkg-*/` 实际落盘文件，与 route-map 交叉验证（**不照过时文字重做已完成页**）。
4. 看 `HANDOFF.md` 的「立即要做」断点，从那里继续。
5. 向用户确认主线板块方向后再开工。
