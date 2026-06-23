# 交接文档 HANDOFF（最后更新 2026-06-22 · 书院全迁 + 线下板块迁移中）

> 本文是**总入口**。两类接手人请各看对应章节，再按引用深入其他文档。
> - **Claude Code**：负责优化已上线的正式项目、清理 v0 误引入的旧页面 → 看「第一部分」
> - **新 v0 账号**：负责继续把原型迁移到 uni-app H5 → 看「第二部分」
>
> 配套文档（同目录 `vue3/compare/`）：
> - `route-map.json` —— **唯一权威真源**，每页 owner/status/note/deprecated/supersededBy
> - `DEPRECATED.md` —— 旧套/废弃页清单（给 CC 的清除/替换指令）
> - `REVIEW-FIXES.md` —— 改动 B 账号已上线页的备忘录
> - `audit-reachability.mjs` —— 可达性排查工具
> - **`WORKFLOW-STANDARDS.md` —— 完整工作流/铁律/技术经验（新 v0 账号必读，因 `v0_memories/` 不随 ZIP 下载）**
>
> ⚠️ **新 v0 账号特别注意**：原账号的 v0 记忆（`v0_memories/`）跟随原用户账号，**不会包含在下载的项目 ZIP 里**，你无法自动继承。所有工作规范已固化到 `WORKFLOW-STANDARDS.md`，**开工前务必先读它 + 本文件 + `route-map.json`**。

---

## 项目背景（两类人都先读）

- **目标**：把 Next.js 原型（`app/**`）逐页 1:1 高保真迁移到 uni-app(vue3) H5（`vue3/src/**`）。
- **唯一真源是原型**：照抄其结构/配色/文案，不自由发挥。

> ⚠️ **质量铁律（2026-06-22 血的教训）**：新建任何有 UI 的页后，**必须**跑 `node capture-and-diff.mjs --filter=<页名>` 并**人眼看 `output/*__diff.png` 三联图**才能宣称完成。曾因跳过此步、只截单图人眼扫一眼，导致同城 feed 出现两处缺陷未被发现：① mock 数据被**自行编造**（价格/时间/距离/统计数全偏离原型，违反"唯一真源是原型"）；② 漏掉原型的"定位失败"提示条。**数据必须逐字段照搬原型的 mock，禁止凭感觉填值**（封面/头像原型用 placeholder，迁移时用空值+灰底 `#E5E5E5` 占位匹配）。注：diff 脚本 PASS_RATIO=0.5% 极严，跨框架页普遍"FAIL"在 4~10%，**百分比要人眼解读**——确认红色是全局字体行高的"双影"累积偏移（无害）还是某处结构性缺陷（必须修）。截图里 SVG 上的蓝色方框是工具 focus 标注，非真实渲染。
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
- **书院/研究院板块（pkg-institute）**：14 页全部迁完（2026-06-22）。详见下方「书院板块（已完成）」。
- **线下驿站板块（pkg-offline）**：19 页中已迁 7 页（2026-06-22，进行中）。详见下方「线下板块（进行中）」。

> ⚠️ **2026-06-20 审计纠偏**：早期交接摘要曾写"古籍剩余 ~10 页、下一步做 audiobooks/[id]"，**该信息已过时**——后续会话已把古籍 + 电子书全部迁完。接手人务必先核磁盘 `vue3/src/pkg-*` 实际落盘 + 行数，再决定是否迁，**不要照过时文字重做已完成的页**。

---

## 书院板块（pkg-institute，14/14 已完成 · 2026-06-22）
> 数据源：原型 `lib/api/institute.ts` 的 mock 已 1:1 复刻到 `vue3/src/lib/institute-data.ts`。逐页详情见 `route-map.json`（`proto:/institute*`）。
- **第一批（6 页）**：`/institute` 首页中枢、`/institute/instructors` 讲师广场、`/institute/instructors/[id]` 讲师详情（复用 instructor-detail）、`/institute/events` 活动列表（列表/日历双视图）、`/institute/events/[id]` 活动详情、`/institute/apply` 讲师申请（表单/状态双态）。
- **第二批（4 页·讲师工作台）**：`/institute/my-tasks` 我的任务、`/institute/teacher-pool` 线下老师人才库、`/institute/teacher-demand` 课程需求大厅、`/institute/teacher-demand/create` 发布师资需求（落点目录名 `demand-create`）。
- **第三批（4 页·成员管理）**：`/institute/members` 成员列表、`/institute/members/[id]` 成员详情（**复用讲师详情页**，原型该页本就直接复用 `InstructorDetailPage`）、`/institute/member-apply` 成员申请四步向导、`/institute/demands/create` 发布通用需求（落点目录名 `demands-create`）。
- ⚠️ **占位**：`/institute/demands/:id`（课程需求详情）暂指向 coming-soon，CC 后续可补真实页。
- ⚠️ **banner 配色坑**：原型 `/institute` banner 用 `bg-gradient-to-br from-primary/20 to-secondary/20`（浅粉灰 20% 透明）+ 深色文字，**不是实色红 + 白字**。曾因此 diff 高达 29%，改浅色渐变后降到 22%（剩余为渐变色相的 pixelmatch 敏感，肉眼已一致）。
- ⚠️ **自定义色 token**：原型 `gold/operator/success/info` 等自定义 Tailwind token，迁移时统一转内联 hex（gold→`#d4a017`、operator→`#c41e3a`、success→`#16a34a`、info→`#2563eb`）。

## 线下板块（pkg-offline，7/19 已完成 · 进行中）
> 新建独立分包 `pkg-offline`（C 端线下驿站），**与 `pkg-merchant` 的 station-* 商户经营页物理隔离**，勿混淆。
> 数据源：原型 `lib/api/offline.ts`（1529 行 mock）逐段复刻到 `vue3/src/lib/offline-data.ts`。
- **已迁（7 页）**：
  - 发现：`/offline/stations` 驿站列表（列表/地图切换+类型筛选+附近横滚）、`/offline/stations/[id]` 驿站详情（4 Tab+设施宫格+底部栏）。
  - 课程：`/offline/courses` 课程列表（驿站+时间筛选）、`/offline/courses/[id]` 课程详情（3 Tab+报名/已报名两态+入场码弹窗）。
  - 预约交易：`/offline/teacher-booking` 讲师预约（938 行最大页，预约咨询/我的预约双 Tab+月历+时段宫格）、`/offline/events` 线下活动列表（页面内联 mock）、`/offline/checkin` 课程签到（当前日期已过窗口故显示"签到未开放"，逻辑正确）。
- **剩余（12 页，按批推进）**：
  - **C 端交易批（3 页）**：`/offline/orders` 订单、`/offline/products` 商品、`/offline/settlements` 结算。← **下一批就做这个**（数据源已查：orders/products 见 offline.ts，settlements 待定位）。
  - **驿站后台批（5 页）**：`/offline/manage` 后台首页、`/offline/manage/info` 驿站信息、`/offline/manage/courses` 课程管理、`/offline/manage/courses/[id]` 课程编辑、`/offline/manage/courses/create` 新建课程。（manage/* 多为页面内联 mock）
  - **后台运营批（4 页）**：`/offline/manage/marketing` 营销、`/offline/manage/orders` 订单管理、`/offline/manage/products` 商品管理、`/offline/manage/students` 学员管理。
- ⚠️ **关键技术决策（务必延续）**：
  - **取 query 参数用 `onLoad((q)=>...)`**（来自 `@dcloudio/uni-app`），**不要用 `getRouteQuery`（不存在）**。详情页默认值用 `数据数组[0].id` 兜底。
  - **封面/头像**：原型用 unsplash/placeholder，迁移时一律用**米色/灰底 CSS 渐变占位 + 居中图标**，不引外链图。
  - **Math.random 替换**：原型 `getTeacherAvailability` 用 `Math.random()` 生成时段可用性，迁移时改**确定性伪随机 `seededAvailable(seed)`**（`Math.sin` 哈希），保证 diff 可稳定复现。
  - 新增图标已补到 registry：`car`、`coffee`、`map`、`calendar-plus`。
- ⚠️ **route-map 已全部登记**（institute 14 条 + offline 7 条均在 `route-map.json`，`migratedAt:2026-06-22`）。

## 本轮新增（2026-06-22）—— 主题：断链修复 + 孤儿页清理收尾
> 逐页详情见 `route-map.json`（`migratedAt:2026-06-22`），此处仅列重点。本轮聚焦**修复已上线页调用却无目标的断链**，每页均已补 `router.ts` 映射 + `route-map` 登记 + 浏览器验证。

**断链修复页（高价值，原已有入口在调用却落到 toast 兜底/占位）**
- `/customer-service`（客服页 566 行，app-header 铃铛/客服图标调用的断链）→ 已迁 + 接入口。
- `/publish`（创作编辑器 692 行）+ `/drafts`（草稿箱）→ drafts 草稿卡点击带 `?draft=` 跳 publish，闭环。
- `/auth/recover`（找回账号方式选择）→ 修复「设置-手机页」`找回原账号` 断链；手机/邮箱子页 toast 占位，联系客服跳 feedback。
- `/fortune`（每日运势主页）→ 修复金刚区「运势」入口断链（原指向不存在的 `/pkg-classics/fortune`）。
- `/same-city/feed`（同城发现 Feed）→ 接入 app-header『同城』tab（原 `href:'/'` 占位）。城市切换+类型筛选+卡片列表+城市弹层；卡片详情/导航 toast 占位（各类详情页未迁）。补 `navigation` 图标。
- `/content/community-rules`（社区规范）→ 修复举报详情页「内容规范」入口断链。
- `/history`（浏览历史顶级真实版）→ 修复 profile「常用功能」`浏览历史` 断链（区别于孤岛 `/mine/history`）。

**孤儿页处理决定**：第二梯队「在原型里无入口」的孤儿页（每日任务/排行榜/我的圈子/签到/公告/续费/支付成功等），经与用户确认**按既有约定 skip**，只把其中有现成入口可接的「同城 feed」迁移并接通，其余不迁（避免迁无人可达的页）。

**纯别名补齐（目标页早已迁好，仅缺 `router.ts` ROUTE_MAP 映射，0 新增页）—— 经全局 `navigateTo` 断链扫描发现 7 处：**
- `/agent/customer-service`（帮助中心调用的带前缀客服路径）→ `/pkg-agent/agent/customer-service`
- `/seckill`（活动详情「秒杀」入口）→ `/pkg-shop/seckill/index`
- `/policy/privacy`（设置「隐私政策」）→ `/pkg-settings/privacy-policy/index`（已浏览器验证落地）
- `/terms/service`（设置「服务协议」）→ `/pkg-settings/user-agreement/index`
- `/station/notices`（站长面板「公告」）→ `/pkg-notices/index/index`
- `/paipan/ai`、`/paipan/history`（排盘工具首页 AI 解盘 / 历史记录）→ 指向 `/pkg-paipan/tools/coming-soon`。⚠️ 此二者**在原型自身即死链**（proto 无 `paipan/ai`、`paipan/history` 目录，仅 `tools/coming-soon`），故指向占位页并由调用方传 `?name=` 显示功能名（已验证显示「AI智能解盘开发中」）。CC 若后续要做真实历史聚合页，可改此映射。
> 排查方法：`grep navigateTo/go/reLaunch 字面量路径 → 逐一判断 ROUTE_MAP 有 key 或直达 pkg 分包页存在 → 列出无目标者`。这是本项目最高频的隐性问题（页迁好了但调用方路径与映射对不上）。

**二次兜底扫描（`<navigator>` / `uni.navigateTo` 直调 / `switchTab` / 模板字符串动态拼接）**：除下述 offline 外**全部干净**——全项目跳转统一走 `router.ts` 工具（无硬编码 `<navigator url>`、无绕过 router 的 `uni.navigateTo` 直调），动态拼接前缀对应的分包均存在。

**offline 线下板块断链 → 降级到 coming-soon 占位（板块整体暂缓未迁，经用户确认不新建业务页）**：
- `/offline/teacher-booking`（讲师中心「预约授课」按钮，静态+query）→ ROUTE_MAP 映射到 `/pkg-paipan/tools/coming-soon`。**已端到端验证**：讲师详情页点「预约授课」→ 落到「开发中」页。
- `/offline/courses/:id`（我的预约「课程」跳转，动态段）→ DYNAMIC_ROUTES 正则映射到同一占位页。
- ⚠️ 因 ROUTE_MAP 值不能内嵌 query（会与调用方 query 冲突成双 `?`），占位页显示默认「此功能开发中」而非具体功能名。CC 迁移 offline 批次时把这两��映射改为真实页即可。

## 立即要做的（接续上一批 · 2026-06-22）
**线下板块 C 端交易批（3 页）——这是断点，从这里继续：**
1. `/offline/orders` 订单列表 — 原型 `proto-ref-app/offline/orders/page.tsx`，数据源 `lib/api/offline.ts`。
2. `/offline/products` 商品列表 — 原型 `proto-ref-app/offline/products/page.tsx`。
3. `/offline/settlements` 结算 — 原型 `proto-ref-app/offline/settlements/page.tsx`（先 grep 定位其数据源）。

**接续步骤（照搬上一批已验证的流程）**：
- 读 3 个原型 → 把数据段复刻进 `vue3/src/lib/offline-data.ts`（追加，勿覆盖）→ 写 3 个页面到 `vue3/src/pkg-offline/{orders,products,settlements}/index.vue`。
- 注册三件套：`pages.json`（pkg-offline 分包加 3 条）+ `router.ts`（ROUTE_MAP 加 `/offline/orders` 等静态映射，若有 `:id` 详情加 DYNAMIC_ROUTES）+ `route-map.json` 登记。
- `npx vue-tsc --noEmit` 零错误 → agent-browser 移动端（512×1107）截图人眼验证。
- 之后依次做「驿站后台批（5 页）」「后台运营批（4 页）」，offline 板块即全部完成。

> ⚠️ **过时信息纠正**：早期文档曾写「institute 等运营管理端按约定 skip」——**该约定已被用户推翻**，institute（书院）已全部迁完，offline（线下）正在迁。接手人以本「立即要做」+ route-map 实际状态为准。

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
- 色值照抄原型 `globals.css` 变量真实 hex：`--gugong-red:#c41e3a`、`--jewel-gold:#c9a96e`（指南的三红���金与此一致）。

## 剩余板块（参考 `PENDING-PAGES.md` + route-map status≠migrate/golden/reviewed）
继续迁移前务必判活页。常见内聚板块：points 积分、im 聊天、qa 问答、help 帮助等。
- **当前主线**：先把 **offline 线下板块剩余 12 页**做完（见上方「立即要做」）。
- ⚠️ **skip 约定已更新**：institute（书院）**已全部迁完**、offline（线下）**正在迁**——不再 skip。其余运营管理端（merchant/station/operator/competition）**是否迁待用户确认**，勿擅自开工，也勿擅自 skip；接手时先问用户主线方向。

---

## 当前数据快照（2026-06-22）
- route-map：golden 48 / migrate 277 / reviewed 57 / skipped 20；deprecated 标记 20 条；总 pair 404。
- 本轮新增落盘：`pkg-institute` 13 个 index.vue（对应 14 原型页，members/[id] 复用 instructor-detail 不另造）+ `pkg-offline` 7 个 index.vue。
- 本轮新增数据文件：`vue3/src/lib/institute-data.ts`、`vue3/src/lib/offline-data.ts`（均从原型 `lib/api/*.ts` 1:1 复刻）。
- 已隔离旧套：settings(10) + wallet(1) + profile相关(9) = 20 个，全部标 deprecated + supersededBy。
- 工具：`compare/` 下有 audit-reachability / capture-and-diff / audit-status / diag-route 四个脚本。

## 交接检查清单（新接手人开工前确认）
- [ ] 读完本文 + `migration-workflow.md`（记忆文件，含完整工作流）
- [ ] 理解「新旧两套」教训和判活页三信号
- [ ] 知道 `route-map.json` 是唯一真源
- [ ] 知道 A golden 不动、改 B reviewed 要写 `REVIEW-FIXES.md`
- [ ] 跑通一次 `capture-and-diff.mjs` 验收流程
