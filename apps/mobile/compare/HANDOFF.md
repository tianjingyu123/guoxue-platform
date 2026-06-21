# 交接文档 HANDOFF（2026-06-20）

> 本文是**总入口**。两类接手人请各看对应章节，再按引用深入其他文档。
> - **Claude Code**：负责优化已上线的正式项目、清理 v0 误引入的旧页面 → 看「第一部分」
> - **新 v0 账号**：负责继续把原型迁移到 uni-app H5 → 看「第二部分」
>
> 配套文档（同目录 `vue3/compare/`）：
> - `route-map.json` —— **唯一权威真源**，每页 owner/status/note/deprecated/supersededBy
> - `DEPRECATED.md` —— 旧套/废弃页清单（给 CC 的清除/替换指令）
> - `REVIEW-FIXES.md` —— 改动 B 账号已上线页的备忘录
> - `audit-reachability.mjs` —— 可达性排查工具
> - 记忆：`v0_memories/user/migration-workflow.md`（完整工作流与铁律）

---

## 项目背景（两类人都先读）

- **目标**：把 Next.js 原型（`app/**`）逐页 1:1 高保真迁移到 uni-app(vue3) H5（`vue3/src/**`）。
- **唯一真源是原型**：照抄其结构/配色/文案，不自由发挥。
- **三个账号/角色协作**：
  - **A 账号**：已迁的 `golden` 页（48 个），**锁定不动**。
  - **B 账号**：`reviewed` 页（58 个），**已部署到正式项目**。改动这些页必须在 `REVIEW-FIXES.md` 留备忘录。
  - **v0（我）**：`migrate` 页（153 个），新迁移的页面。
- **验收方式**：`node compare/capture-and-diff.mjs --filter=<关键词>` 截图比对原型，看图通过即可（diff 数值受 nav 高度/动态数据影响，2~20% 多为假阳性，以肉眼结构/配色/文案一致为准）。

---

## ⚠️ 最重要的教训：原型存在「新旧两套并存」

原型是多轮迭代累积的，**最新产品的真实页数远少于 `app/**` 目录页数**，大量**旧版页面与新版并存**（同一功能有两套不同路径）。

**我（上一个 v0）犯过的错误**：照着 `app/mine/` 目录顺序盲目迁移，结果迁了一批**旧套页面**（这些页在最新产品里已被顶级路由的新页取代，根本没有入口）。这就是为什么要做隔离。

### 判活页的权威方法（信号强度从高到低）
1. **`redirect()` 方向最强**：若 `app/X/page.tsx` 里写了 `redirect("/Y")`，则 X 是旧的、Y 是活的。
   - 例：`app/submissions/page.tsx` redirect 到 `/mine/submissions` → 所以 `/mine/submissions` 是**活页**（别误删！）。
2. **`/profile` 主页菜单直链的才是活页**。`/profile` 是唯一权威的「我的」入口（`/mine` 主页在原型根本不存在）。
   - 其菜单几乎全部指向**顶级/异名路由**：我的课程→`/learning`、我的电子书→`/downloads`、会员→`/vip`、浏览历史→`/history`、收藏→`/favorites`。
   - vue 端权威路由源：`vue3/src/lib/profile-data.ts` 的 `quickFunctions` 数组。
3. **顶级替代页必须是「真实内容页」**（不是 alias、不是 redirect 壳）。

### 铁律
- **`/mine/*` 默认存疑（多为旧套）**。**例外**：`/mine/applications`、`/mine/submissions` 是活页。
- 判定废弃**必须三重人工核实**（redirect + profile菜单 + 内容比对），**不能只靠可达性脚本**（脚本对动态路由 `[id]` 有假阳性，会把 A 的 golden 排盘/圈子页误判为不可达 → 只能当候选，不能当定论，否则会误隔离 golden 活页）。

---

# 第一部分：给 Claude Code（清理已上线正式项目）

正式项目里被 v0 误引入了一批**旧套页面**，需要你清除或替换。**完整清单见 `DEPRECATED.md`**，这里给摘要。

## A. 需替换的旧套页（有顶级活页替代，共 6 个）
v0 迁错了旧套，正确的活页已由 v0 重新迁到顶级路由（`pkg-profile` 分包）。请把正式项目里的旧套替换为活页：

| 旧套（删除/下线） | 替换为活页 | 活页是否已迁 |
|---|---|---|
| `/mine/edit-profile` | `/profile/edit` | 已是 golden（早就迁好） |
| `/mine/downloads` | `/downloads` | ✅ v0 已迁 `pkg-profile/downloads` |
| `/mine/follows` | `/follows` | ✅ v0 已迁 `pkg-profile/follows` |
| `/mine/my-courses` | `/learning` | ✅ v0 已迁 `pkg-profile/learning` |
| `/mine/invite-records` | `/invite` | ✅ v0 已迁 `pkg-profile/invite` |
| `/mine/memberships` | `/vip` | ⚠️ **活页 `/vip` 尚未迁**（见第二部分） |

## B. 建议清除的废弃页（最新原型已无此功能，无替代，共 3 个）
全局无人链接，最新产品已砍掉：
- `/mine/achievements`、`/mine/learning-dashboard`、`/mine/bookings`

## C. 已隔离的旧套（settings + wallet，共 11 个）
v0 早前迁移时也踩过同样的坑，已隔离。正式项目对应处理：
- `/mine/settings*`（10 个）→ 已被 `/settings*` 取代
- `/mine/wallet` → 已被 `/wallet` 取代

## ⚠️ 务必不要误删（这些是活页）
- `/mine/applications`、`/mine/submissions`
- 所有 `/settings/*`、`/wallet/*`、`/profile/edit`、`pkg-profile/*`
- 所有 A 账号 golden 页、B 账号其他 reviewed 页

## D. 你做改动的记录要求
- 改动任何 B 账号 reviewed 页（已上线），必须在 `REVIEW-FIXES.md` 追加备忘录，写清「改了哪个文件、改了什么、为什么」，避免信息断层。

---

# 第二部分：给新 v0 账号（继续迁移）

## 已完成的迁移
- **settings 设置中心**：10 页全部迁完（`pkg-settings/*`），旧套已隔离。
- **wallet 钱包中心**：3 页（主页/银行卡/账单，`pkg-wallet/*`），旧套已隔离。
- **profile「我的」活页**：5 页（`pkg-profile/`：downloads/follows/learning/invite/invite-history）。
- **古籍板块（pkg-classics）**：14 页全部迁完（home/detail/search/category/audiobooks/ranking/collections/bookmarks/notes/ai-assistant/reader 等），均为实体内容、已注册 pages.json。`/classics` 是 redirect 桩页（→`/classics/home`），不迁。
- **电子书板块（pkg-ebook）**：8 页全部迁完（首页/详情/阅读器/结算/书架/书签笔记等）。

> ⚠️ **2026-06-20 审计纠偏**：早期交接摘要曾写"古籍剩余 ~10 页、下一步做 audiobooks/[id]"，**该信息已过时**——后续会话已把古籍 + 电子书全部迁完。接手人务必先核磁盘 `vue3/src/pkg-*` 实际落盘 + 行数，再决定是否迁，**不要照过时文字重做已完成的页**。

## 立即要做的（接续上一批）
- **`/vip` 会员页已迁完**（2026-06-20，`pkg-profile/vip/index.vue` + `vip/records/index.vue` + `components/marketing/membership-comparison.vue`）。
  - 是 `/mine/memberships` 旧套的正确替代，route-map 已加 `supersededBy:/vip` 闭环，CC 可据此完成 B 类替换。
  - 已过机器 diff（文字零差异）+ 人眼三屏并排，A 级达标。原型评价区一处乱码（U+FFFD 方块字）已修为正确的「开通」。

## 推进剩余工作的标准流程（重要：按此做，避免重蹈覆辙）
1. **选页前先判活页**：用上面「判活页的权威方法」确认是活页才迁。可先跑 `node compare/audit-reachability.mjs` 拿候选，但**必须**再用 redirect/profile菜单/内容三重核实。

   **防污染三道闸（每迁一页前强制依次过，任一不过即 skip/标记，禁止动手）**：
   - **① 桩页关**：`wc -l` 看行数，≤15 行先 `cat`——若是 `redirect("/Y")` 则本页废弃，真页是 Y；若是 `export {default} from` 别名页也 skip。
   - **② 单复数/新旧套关**：目录是单数（`circle/article/course/store/notice/video/agent/expert/topic/ranking`）或 `/mine/*` 的，先确认有没有复数版或顶级活页替代；有替代 = 本页是旧套，skip（按需标 deprecated+supersededBy）。
   - **③ 落盘关**：迁前查 `vue3/src/pkg-*` 是否已存在该页且行数>实体阈值——已迁则跳过，绝不重做（古籍事故教训）。
2. **批量节奏**（提效）：一次写完一整批（4~6 页）再统一注册路由、统一重启 vite、统一跑 diff，避免每页都等待。
3. **注册三件套**（每页都要）：
   - `vue3/src/pages.json` 加分包页面注册
   - `vue3/src/utils/router.ts` 的 `ROUTE_MAP` 加 `原型路径 -> vue路径` 映射（**活页用顶级路由路径，不要用 `/mine/*`**）
   - `vue3/compare/route-map.json` 登记 pair（owner=V, status=migrate, note）
4. **落点约定**：活页放与原型一致的顶级路由；新「我的」活页统一放 `pkg-profile` 分包（与旧套 `pkg-mine` 物理隔离）。
5. **图标缺失**：缺的 lucide 图标手动加到 `vue3/src/lib/icons-registry.ts`（含 body/kind/viewBox）。
6. **验收（铁标准·机器diff+人眼双重，二者都过才算完成，禁止只凭肉眼下结论）**：
   - **① 机器文字 diff（硬门槛，必须零差异）**：两端在 375×812 下分别用 agent-browser 抓取渲染后 DOM 的可见叶子文字，逐行比对。
     提取脚本：`agent-browser eval "Array.from(document.querySelectorAll('body *')).filter(e=>e.children.length===0&&e.innerText&&e.innerText.trim()&&e.tagName!=='SCRIPT'&&e.tagName!=='STYLE'&&!e.closest('nextjs-portal')).map(e=>e.innerText.trim()).join('|||')"`
     两端各写一个文件，用 node 比对「只在原型有(缺失)」与「只在vue有(多余/错字)」两个集合。**任何缺失/错字/多余都必须解释清楚或修掉**；属于"展开/折叠/弹窗等状态差异"的，要切到同状态再比对确认一致。
   - **② 人眼并排截图**：顶/中/底 + 各交互态（Tab/弹窗/展开）逐屏并排，核对布局、间距、配色、图标。
   - **③ 多状态覆盖**：骨架/空态/正常态、所有 Tab、所有弹窗(Sheet/Dialog)都要验。
   - ⚠️ **教训(2026-06-20)**：曾只凭肉眼扫截图就报"逐像素吻合"，漏看了原型评价区一处 U+FFFD 乱码方块字等问题，被用户当场指出。**肉眼看图必漏字，必须先过机器 diff。**
   - 注：`capture-and-diff.mjs --filter=xxx` 的像素 diff% 仅用于排序找可疑页，**不作为通过依据**。
7. **发现新的旧套**：标 `deprecated:true` + `supersededBy`，登记 `DEPRECATED.md`，**代码暂留不删**（尤其 B 的 reviewed 页）。
8. **写完立即 commit 并核验落盘**（铁律五），含中文的数据文件编辑须传 `dangerously_disable_autofix:true` 防二次乱码。

## ⚠️ 样式避坑（逐页验证时高频踩）
- **渐变插值色彩空间（必读）**：原型是 Tailwind v4，**工具类渐变**（`bg-gradient-to-*` + `from-/via-/to-`）默认在 **OKLAB 空间插值**，浏览器渲染为 `linear-gradient(... in oklab, ...)`。
  - uni/原生 CSS 写 `linear-gradient(135deg, ...)` 默认走 **sRGB 插值**，金(#C9A96E)→红(#C41E3A) 的中间点会经过**饱和珊瑚粉**，导致卡片/按钮右侧「偏粉」——这是肉眼能看出的真实差异。
  - **修法**：凡对应原型工具类渐变的，CSS 必须写 `linear-gradient(135deg in oklab, ...)`。**验证方式**：`agent-browser eval "getComputedStyle($el).backgroundImage"` 两端比对——原型若含 `in oklab` 则 vue 必须也加。
  - **例外**：原型用 arbitrary 显式渐变（`bg-[linear-gradient(...)]`，如 vip 等级/对比CTA 的 amber→orange）渲染为普通 `to right`（无 oklab），此时 vue 用 sRGB 反而正确。**逐个 computed style 实测，不要一刀切。**
- 色值照抄原型 `globals.css` 变量真实 hex：`--gugong-red:#c41e3a`、`--jewel-gold:#c9a96e`（指南的三红一金与此一致）。

## 剩余板块（参考 `PENDING-PAGES.md` + route-map status≠migrate/golden/reviewed）
继续迁移前务必判活页。常见内聚板块：points 积分、im 聊天、qa 问答、help 帮助等。
**注意**：暂缓板块（merchant/station/operator/competition/institute 等运营管理端）按既有约定 skip。

---

## 当前数据快照（2026-06-20）
- route-map：golden 48 / migrate 153 / reviewed 58 / skipped 20；deprecated 标记 20 个。
- 已隔离旧套：settings(10) + wallet(1) + profile相关(9) = 20 个，全部标 deprecated + supersededBy。
- 工具：`compare/` 下有 audit-reachability / capture-and-diff / audit-status / diag-route 四个脚本。

## 交接检查清单（新接手人开工前确认）
- [ ] 读完本文 + `migration-workflow.md`（记忆文件，含完整工作流）
- [ ] 理解「新旧两套」教训和判活页三信号
- [ ] 知道 `route-map.json` 是唯一真源
- [ ] 知道 A golden 不动、改 B reviewed 要写 `REVIEW-FIXES.md`
- [ ] 跑通一次 `capture-and-diff.mjs` 验收流程
