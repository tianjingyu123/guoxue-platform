# v0 → Claude Code 联调交接备忘录

> 本文件由 v0 生成，记录本轮**新增/迁移**的 Vue3(uni-app H5)页面，方便 Claude Code 针对性地做前后端联调对接。
> 生成时间：2026-06
> 已覆盖板块：①分站运营商 ②站长后台 ③**古籍板块（新增）**
>
> 📌 **2026-06 增补**：新增「古籍板块」(pkg-classics) 5 个页面 + 古籍共享基础组件 + **跨场景讨论母版 DiscussionPanel/Sheet** + **AI 辅助浮层母版**。详见下方 **第 C 节** 与第三节增补行。

---

## 一、背景与现状

- 本项目是**热卜国学 Next.js 原型 → uni-app(Vue3) H5 高保真迁移**。
- 唯一设计真源是原型 `app/<route>/page.tsx`（Next.js）。Vue 页面严格按原型逐像素还原。
- **本轮 v0 新增的页面全部使用「内联 mock 数据」或「`src/lib/*-data.ts` 静态数据」，尚未对接真实后端接口。** 这是 Claude Code 联调的主要工作面。
- ⚠️ 重要：之前已有部分 Vue3 页面（C 端主站、个人中心等）可能已被 Claude Code 接过后端。**本备忘录只覆盖本轮 v0 新做的页面，请勿动其它已联调页面。**

### 关键约定（务必遵守）
1. **配色语义**：故宫红 `#C41E3A` 为运营商/站长后台主色；运营商工作台/名额用紫渐变 `#9254de`；沉寂预警用琥珀 amber；`station/[id]` 演示分站刻意用紫色 `#8B5CF6`（原型如此，勿改）。
2. **图标**：统一用全局 `AppIcon` 组件（无需 import，已全局注册），`size` 单位是 **rpx**（= 原型 px × 2）。图标库在 `src/lib/icons-registry.ts`。
3. **⚠️ autofix 破坏中文坑**：编辑 `src/lib/operator-data.ts` 时，自动格式化会反复把「社区」的「社」字破坏成乱码 U+FFFD。**编辑该文件务必关闭 autofix**，提交前用 `grep -c $'\ufffd'` 全量验残留乱码。
4. 路由均在 `pkg-operator` 分包下：`/pkg-operator/<目录名>/index`，已在 `src/pages.json` 注册。

---

## 二、本轮新增页面清单（按板块）

### A. 分站运营商板块（pkg-operator）

| Vue 页面 | 路由 | 原型来源 | 当前数据来源 | 联调要点 |
|---|---|---|---|---|
| `pkg-operator/join-operator/index.vue` | `/pkg-operator/join-operator/index` | `app/join/operator` | 内联 | 运营商入驻申请表单提交 |
| `pkg-operator/join-station/index.vue` | `/pkg-operator/join-station/index` | `app/join/station` | 内联 | 站长入驻申请表单提交 |
| `pkg-operator/operator-panel/index.vue` | `/pkg-operator/operator-panel/index` | `app/operator`(角色入口) | 内联 | 运营商角色面板入口 |
| `pkg-operator/station-master-panel/index.vue` | `/pkg-operator/station-master-panel/index` | `app/station`(角色入口) | 内联 | 站长角色面板入口 |
| `pkg-operator/agreement-operator/index.vue` | `/pkg-operator/agreement-operator/index` | 运营商协议 | `operator-data.ts` `operatorAgreementSections/Tip` | 静态协议，一般无需联调 |
| `pkg-operator/agreement-station/index.vue` | `/pkg-operator/agreement-station/index` | 站长协议 | `operator-data.ts` `stationAgreementSections/Tip` | 静态协议，一般无需联调 |
| `pkg-operator/dashboard/index.vue` | `/pkg-operator/dashboard/index` | `app/operator/dashboard` | **内联** | 运营商工作台：收益/名额/团队概览统计、双 Tab |
| `pkg-operator/team/index.vue` | `/pkg-operator/team/index` | `app/operator/team` | **内联**（原型契约见 `lib/api/team.ts`） | 团队管理（最大页）：4 Tab（成员/排行榜/动态/案例）+筛选排序+邀请弹窗+成员详情弹窗 |
| `pkg-operator/quota/index.vue` | `/pkg-operator/quota/index` | `app/operator/quota` | `operator-data.ts` `quotaData/quotaRecords/quotaSaleLink` | 名额管理：概览、分配（分享链接/免费赠送双弹窗）、名额记录 |
| `pkg-operator/invite/index.vue` | `/pkg-operator/invite/index` | `app/operator/invite` | `operator-data.ts` `invitedStations/operatorInviteLinkFull/operatorInviteCode`（契约见 `lib/api/invite.ts`） | 邀请站长：奖励说明、邀请码、已邀列表 |
| `pkg-operator/dormant/index.vue` | `/pkg-operator/dormant/index` | `app/operator/dormant` | `operator-data.ts` `dormantMembers` | 沉寂站长预警：单个/一键提醒（提醒接口待接） |
| `pkg-operator/analysis/index.vue` | `/pkg-operator/analysis/index` | `app/operator/analysis` | `operator-data.ts` `analysisMembers` | 下线业绩分析：漏斗 CTR/CVR + 自动诊断 |
| `pkg-operator/settings/index.vue` | `/pkg-operator/settings/index` | `app/operator/settings` | **内联** | 运营商设置：基本信息表单保存、消息通知开关、账号安全 |

### B. 站长后台板块（pkg-operator）

| Vue 页面 | 路由 | 原型来源 | 当前数据来源 | 联调要点 |
|---|---|---|---|---|
| `pkg-operator/station-home/index.vue` | `/pkg-operator/station-home/index` | `app/station/home` | `station-home-data.ts`（契约见 `lib/api/station-home.ts`） | **C 端品牌定制分站首页**：banner 轮播 + 特色入口 + 站长推荐 + feed + 分享海报弹层 |
| `pkg-operator/station-detail/index.vue` | `/pkg-operator/station-detail/index` | `app/station/[id]` | `station-detail-data.ts` + 复用 `home-data.ts` `buildFeedItems` | **C 端分站版首页**：复用主站十宫格/feed/底部导航；演示分站紫色主题；`[id]` 动态参数取分站配置 |
| `pkg-operator/station-teachers/index.vue` | `/pkg-operator/station-teachers/index` | `app/station/[id]/teachers` | **内联** | 老师邀约管理：4 Tab（邀约记录/我的需求/课程排期/费用结算） |
| `pkg-operator/station-poster/index.vue` | `/pkg-operator/station-poster/index` | `app/station/poster` | **内联** | 推广海报：4 模板风格切换 + 保存/分享 |
| `pkg-operator/station-promote/index.vue` | `/pkg-operator/station-promote/index` | `app/station/promote` | **内联** | 推广中心：永久推广链接/二维码 + 临时推荐（生成临时链接） |
| `pkg-operator/station-materials/index.vue` | `/pkg-operator/station-materials/index` | `app/station/materials` | **内联**（契约见 `lib/api/materials.ts`） | 推广素材库：4 Tab（全部/海报/文案/二维码）+ 预览弹层 + 文案复制 |
| `pkg-operator/station-earnings/index.vue` | `/pkg-operator/station-earnings/index` | `app/station/earnings` | **内联**（契约见 `lib/api/earnings.ts`） | 收益明细：渐变总览卡 + 收益明细/提现记录双 Tab + 筛选 + 提现操作 |
| `pkg-operator/station-manage/index.vue` | `/pkg-operator/station-manage/index` | `app/station/manage` | **内联** | 站点管理：4 Tab（基本信息/域名功能/通知设置/安全设置）+ 电商直播 FeatureGate 门控 + 申请弹窗 |
| `pkg-operator/station-config/index.vue` | `/pkg-operator/station-config/index` | `app/station/config` | **内联**（契约见 `lib/api/station-config.ts`） | 分站配置：动态主题色 Header + 8 预设/自定义色 + 实时预览 + 联系方式/小程序码/站长信息 |
| `pkg-operator/station-live/index.vue` | `/pkg-operator/station-live/index` | `app/station/live` | **内联**（契约见 `lib/api/station-live.ts`） | 直播管理：4 筛选标签 + 直播中/预告/回放卡状态（含倒计时） |
| `pkg-operator/station-assistant/index.vue` | `/pkg-operator/station-assistant/index` | `app/station/assistant` | `station-assistant-data.ts` `assistantConfig/buildAssistantReply`（契约见 `lib/api/station-assistant.ts`） | **AI 对话页**：欢迎语+能力标签+推荐问题；消息支持 markdown/柱状图/饼图/表格/操作建议；打字动效；清除弹窗 |

### C. 古籍板块（pkg-classics）—— 2026-06 新增

> 5 个页面全部为 **C 端高频页**，按 **A 类逐像素**标准迁移，与原型 375×812 并排核对通过。路由在 `pkg-classics` 分包，已在 `src/pages.json` 注册。
> 主色为**故宫红 `#C41E3A`**；AI 相关用**鎏金 `#C9A96E`**（避免紫色违规）；页面底色 `--classics-bg`。

| Vue 页面 | 路由 | 原型来源 | 当前数据来源 | 联调要点 |
|---|---|---|---|---|
| `pkg-classics/home/index.vue` | `/pkg-classics/home/index` | `app/classics/page.tsx` | `classics-data.ts` | 古籍首页：搜索入口 + 分类金刚区 + 今日推荐 + 热门书单 + 书籍列表；点击书籍跳详情 `detail/index?id=` |
| `pkg-classics/category/index.vue` | `/pkg-classics/category/index` | `app/classics/category/page.tsx` | `classics-data.ts` | 分类列表：绿色渐变 hero（子部 4150 部）+ 门类筛选 Tab（横滑）+ 最热/最新排序 + 书籍列表（FlatCover 绿封面/免费标/简介/作者朝代人气） |
| `pkg-classics/search/index.vue` | `/pkg-classics/search/index` | `app/classics/search/page.tsx` | **内联** mock | 搜索：4 状态（初始/建议/结果/空态）；毛玻璃头部（返回+搜索框+AI按钮）；搜索历史+热门搜索(HOT标)+为你推荐；建议下拉关键词高亮；结果 ResultRow 含 FlatCover+评分 |
| `pkg-classics/detail/index.vue` | `/pkg-classics/detail/index?id=` | `app/classics/[id]/page.tsx` | **内联** `bookData`(周易/道德经) + `BOOK_DISCUSSIONS` | 古籍详情：封面区 + **AI 智能导读** + 4 AI 功能 + 听书入口 + 目录(可展开子章节) + 书友讨论预览 + 相关推荐横滑 + 底部固定操作栏(加入书架/开始阅读)；唤起**讨论母版抽屉** |
| `pkg-classics/bookshelf/index.vue` | `/pkg-classics/bookshelf/index` | `app/classics/bookshelf/page.tsx` | **内联** mock(书架/历史/分组) | 我的书房：书架/浏览历史双 Tab；分组筛选横滑(全部/命理/道家/养生，带数量 badge)；网格/列表视图切换；网格卡(AI标/已读完/进度条/**读后小结**)；列表卡(竖排书脊纵向卡)；批量管理(多选移除)；空态；浏览历史卡。⚠️ **底色用 `--card`(白)非米色**(忠实原型 `bg-background`)。⚠️ **「读后小结」成就弹窗(canvas 母版)尚未迁移**，当前是 toast 占位，属后续批次 |

> ⚠️ **未迁移的下游路由（详情页内有入口但目标页尚未做）**：`阅读器 /reader/[id]`、`听书 /classics/audiobooks/[id]`。目前这些入口点击是 `uni.showToast('阅读器即将上线')` 占位，**属于后续批次**，联调时先不接。

#### 古籍板块共享母版组件（重点！多页复用，请勿散改）

| 组件 | 路径 | 说明 | 联调/复用要点 |
|---|---|---|---|
| **讨论母版** `DiscussionPanel` | `src/components/common/discussion-panel.vue` | **跨场景统一讨论/评价母版**：评论/评价(带星)双模式、认证标识(讲师/官方/名家/会员)、精选置顶、划线引用、楼中楼回复、最热/最新排序、AI 辅助输入 | 后续电子书/诗词/文章/课程/直播评论都应复用它。数据类型见 `src/lib/discussion-types.ts`(`DiscussionItem/Config`)。联调时把 `items` 接后端评论列表，把内部 `submit/toggleLike/handleReply` 接发评论/点赞/回复接口 |
| **讨论抽屉** `DiscussionSheet` | `src/components/common/discussion-sheet.vue` | 把 `DiscussionPanel` 包成底部 80vh 抽屉(遮罩+拖拽条+关闭)，供「查看全部讨论」唤起 | props：`open/config/items/enableAIAssist`，`@close` |
| **AI 辅助浮层** `AiAssistPopover` | `src/components/common/ai-assist-popover.vue` | 克制型内联 AI 辅助(鎏金)：评论场景「润色/雅化」，向上弹出；候选结果一键采用 | 当前调 `src/lib/ai-assist.ts` 的 `runAIAssist`(本地确定性 mock)。**接真实 AI 时只需替换 `runAIAssist`**，组件层不动；保留返回结构 `{action, candidates[]}` |
| 古籍共享基础 | `src/components/classics/*`(`ClassicsHeader`/`FlatCover`) + `src/lib/classics-cover.ts`(`coverColorForBook`) | 古籍头部(返回/搜索/分享 rightType) + 扁平书封(按书名取配色) | 纯展示组件，无需联调 |

### D. 电子书板块（pkg-ebook）—— 2026-06 新增

> **设计决策**：电子书书架与古籍书架是「**独立同胞页**」而非共享内核。两者外壳像但内核差异大（古籍=分组筛选/读后小结/竖排书脊；电子书=状态筛选/下载离线/横向卡），硬套 variant 会满屏分支更难维护。故各自独立、保持结构范式一致。
> 主色为**知识蓝 `#2563eb`**（区别于古籍故宫红）；页面底色 `--ebook-bg`(#f8fafc)；免费/已读完用绿 `--ebook-free`。token 见 `tokens.scss`。

| Vue 页面 | 路由 | 原型来源 | 当前数据来源 | 联调要点 |
|---|---|---|---|---|
| `pkg-ebook/bookshelf/index.vue` | `/pkg-ebook/bookshelf/index` | `app/ebook/bookshelf/page.tsx` | `ebook-data.ts` `ebookShelfBooks` | 我的书架：按**阅读状态**筛选(全部/阅读中/已读完/未读)；网格/列表双视图；网格卡(深色封面/进度条/已读完绿标/**已下载**角标/长按菜单)；列表卡(横向+底部展开`下载/详情/移出`三分栏)；空态。点击书跳 `ebook/reader/[id]`(**未迁移**，toast 占位) |

> 共享件：`src/components/ebook/flat-book-cover.vue`(深色实底书封，`coverColor` 直接传 hex) + `src/lib/ebook-data.ts`(书架数据/筛选项)。
> ⚠️ **未迁移的电子书下游路由**：电子书首页 `/ebook`、详情 `/ebook/[id]`、阅读器 `/ebook/reader/[id]`、结算 `/ebook/checkout`，目前均 toast 占位，属后续批次。

---

## 三、本轮新增的数据/资源文件

| 文件 | 用途 | 联调建议 |
|---|---|---|
| `src/lib/operator-data.ts` | 运营商板块静态数据（名额/邀请/沉寂/分析/协议）+ 类型导出 | 把各 `export const` 改为后端拉取；⚠️**关闭 autofix 编辑**（中文乱码坑） |
| `src/lib/station-home-data.ts` | 品牌定制分站首页数据（banner/特色入口/推荐/feed/分站信息） | 改为按分站 id 拉取 |
| `src/lib/station-detail-data.ts` | 分站版首页配置（`defaultStationConfig` 主题、`featuredTypeConfig`） | 改为按 `[id]` 拉取分站配置 |
| `src/lib/station-assistant-data.ts` | AI 助手配置 + `buildAssistantReply` 本地模拟应答（含图表/表格/操作 mock） | **替换为真实 AI 接口**：保留返回结构（text/markdown/chart/table/actions），把 `buildAssistantReply` 换成流式后端调用 |
| `src/lib/icons-registry.ts` | 本轮新增图标：`mouse-pointer-click`、`quote`、`snowflake`（+ 早前 `arrow-down-right`）；**古籍轮新增**：`pen-line`/`network`/`bookmark-plus`/`bookmark-check`/`grid-3x3`/`folder-plus`/`wand-2`/`heading`/`text-quote`/`feather`/`corner-down-right` | 无需联调 |
| `src/static/images/station/share-poster.png` | 分享海报示例图 | 真实环境应由后端/canvas 动态生成海报 |
| **`src/lib/classics-data.ts`** | 古籍板块数据（首页/分类 `CAT_CONFIG`+`CAT_BOOKS`/书单/推荐等）+ 类型 | 改为后端拉取；⚠️**关闭 autofix 编辑**（中文乱码坑） |
| **`src/lib/classics-cover.ts`** | `coverColorForBook()` 按书名取扁平书封配色 | 纯前端，无需联调 |
| **`src/lib/discussion-types.ts`** | 讨论母版数据类型 `DiscussionItem`/`DiscussionConfig` | 联调时后端评论 DTO 对齐此结构 |
| **`src/lib/ai-assist.ts`** | AI 辅助浮层的本地确定性 mock `runAIAssist`（润色/雅化候选） | **接真实 AI 时只替换 `runAIAssist`**，保留 `{action, candidates[]}` 返回结构 |

---

## 四、联调注意事项（给 Claude Code）

1. **数据形态已对齐原型契约**：每个页面的 mock 字段命名/结构都参照了原型 `lib/api/*.ts`（Next.js 侧）。联调时优先复用原型的接口契约，减少前端改动。
2. **保持 UI/交互不变**：所有页面已与原型逐像素核对（375×812）。联调请只替换**数据来源**，不要改动布局、配色、文案、图标尺寸。
3. **emoji 是原型数据的一部分**：`team` 动态时间线节点（👋💰⬆️🤝🏆）、`station-assistant` 表格奖牌（🥇🥈🥉）是原型自带数据，**不是图标**，联调时若来自后端请原样透传。
4. **弹窗/Tab 状态是纯前端**：各页的弹窗、Tab 切换、筛选、复制、loading/saved 态都是本地状态，联调时保留即可，只需把"提交/保存/提现/申请/发送消息"等动作接到真实接口。
5. **`station-assistant` 流式**：当前 `buildAssistantReply` 是同步本地模拟。接真实 AI 时建议改为流式（SSE/分块），前端已有打字动效容器可复用。
6. **`station-detail` 的 `[id]`**：当前是固定演示分站。联调时应从路由 query 取分站 id，按 id 拉取主题色与内容。
7. **古籍页路由用 query 传参**（uni-app 无 `[id]` 动态段）：详情页是 `detail/index?id=xxx`、分类页是 `category/index?cat=jing|shi|zi|ji`，在 `onLoad(options)` 取参。联调时按此参数拉取数据。
8. **⚠️ AppIcon 的 `color` 必须传具体色值（hex），禁止传 `var(--xxx)`**：`app-icon.vue` 把颜色嵌进 SVG data-URI，CSS 变量在隔离 SVG 内无法解析 → 图标不可见。已统一用 `#2c2c2c`(文字)/`#999999`(次要)/`#c41e3a`(故宫红)/`#C9A96E`(鎏金)。新增图标交互时请沿用 hex。
9. **讨论母版是统一组件**：古籍详情的「书友讨论」用的是 `DiscussionPanel`/`DiscussionSheet`。后续任何带评论/评价的页面都应复用，不要各自实现。接后端时统一改这一处的 `items` 与提交/点赞/回复动作即可。
10. **AI 辅助 = 克制内联**：`AiAssistPopover` 只做"润色/雅化"等轻量辅助，向上弹候选、一键采用；不是聊天框。接真实模型时仅替换 `runAIAssist`。

---

## 五、Git 状态
- 所有改动已 commit（工作树干净），通过 v0 的 GitHub 集成同步到连接的仓库分支。
- 累计新增：分站运营商 + 站长后台 24 页 + **古籍板块 5 页**（首页/分类/搜索/详情/书架）。
- 古籍轮新增共享件：**讨论母版 `DiscussionPanel`/`DiscussionSheet` + AI 辅助浮层 `AiAssistPopover`**（跨场景复用）、古籍基础组件(`ClassicsHeader`/`FlatCover`)、数据文件 `classics-data.ts`/`classics-cover.ts`/`discussion-types.ts`/`ai-assist.ts`。
- 古籍下游路由（`reader/[id]` 阅读器、`audiobooks/[id]` 听书）**尚未迁移**，详情页内为 toast 占位，属后续批次。
