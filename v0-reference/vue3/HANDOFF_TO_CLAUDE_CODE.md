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
> ⚠️ **更正(2026-06-22 v0 复核)**：上面这条"电子书下游路由均 toast 占位"的说法**已过时**。实际 `pkg-ebook` 全部 7 个页**均已迁移且内容完整**：`store`(551行)、`detail`(768行)、`reader`(675行)、`checkout`(488行)、`bookshelf`(623行)、`notes`(418行)、`bookmarks`(298行)。**但目前没有任何页面/金刚区导航到电子书板块**(grep 入口全空)——即这是一组"页已迁好、入口未接"的孤岛群(同 `my-comments` 情况)。Claude Code 联调时若需启用电子书板块，只需在合适位置(如金刚区或书城入口)加一个指向 `/pkg-ebook/store/index` 的入口即可，无需重新迁移。

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

## E. 本轮（2026-06-22）独立页迁移 + 断链修复 + 孤岛页标记 —— ⚠️ Claude Code 必读

> 本轮 v0 补迁了一批**散落的独立页**，并系统排查修复了**导航断链**。下面三块信息对联调和避免重复劳动很关键。

### E-1. 本轮新迁页面清单

| Vue 页面 | 路由(proto) | 原型来源 | 数据来源 | 联调要点 |
|---|---|---|---|---|
| `pkg-settings/user-agreement/index.vue` | `/legal/user-agreement` | `app/legal/user-agreement` | `lib/legal-data.ts`(用户协议8节) | 静态法务文档；meta 行「版本 v2.1 / {effectiveDate} 生效」；底部「我已阅读并同意」确认栏 |
| `pkg-settings/privacy-policy/index.vue` | `/legal/privacy-policy` | `app/legal/privacy-policy` | `lib/legal-data.ts`(隐私政策7节) | 静态法务文档；meta 行「版本 v2.0 / 更新于 {updatedAt}」(注意与上面格式不同) |
| `pkg-settings/child-privacy/index.vue` | `/legal/child-privacy` | `app/legal/child-privacy` | `lib/legal-data.ts`(儿童隐私5节) | **独立布局**(盾牌导航+v版本/提示卡/更新日期行/监护人联系方式卡/悬浮目录钮)，与上两页不同 |
| `pkg-account/address/index.vue` | `/address` | `app/address` | 内联 mock(3条地址+REGIONS) | **第②套收货地址(弹窗版)**，见 E-3 |
| `pkg-mine/notifications/index.vue` | `/notifications` | `app/notifications` | `lib/api/messages.ts`(18条) | **通知中心(列表)**，区别于 `/settings/notifications`(通知设置开关页) |
| `pkg-mine/browse-history/index.vue` | `/history` | `app/history` | `lib/api/history.ts`(9条分3组) | **浏览历史(分组+多选删除版)**，见 E-3。修复了 profile 断链 |
| `pkg-report/community-rules/index.vue` | `/content/community-rules` | `app/content/community-rules` | 内联(鼓励5/禁止7/处罚4级) | 静态社区规范页；举报详情页的「内容规范」入口指向它 |

> **共享数据模块新增**：`src/lib/legal-data.ts`(三份法务文档结构化 sections，含段落/加粗/列表/锚点)。三个 legal 页共用。
> **图标新增**：`check-check`、`megaphone`(通知中心用)。
> ⚠️ **原型字段 bug（已修复）**：原型三个 legal 页读 `document.content`，但 API 实际返回 `htmlContent`，导致原型正文空白；child-privacy 更因不在 `mockDocList` 整页失败。迁移版改用结构化数据正常渲染——**这是有意修复，不是偏离原型**。联调时若后端返回正文，请对齐 `legal-data.ts` 的 sections 结构。

### E-2. ⚠️ 断链修复（2026-06-22）—— 已修复，请勿回退

排查方法：提取 `router.ts` 的 ROUTE_MAP 映射 key，与全 vue 代码中 `navigateTo` 调用的字面量路径比对。发现 **7 处** proto 路径被代码调用、但 ROUTE_MAP 缺映射 → 跳转落到 `navigateTo` 的 `toastComingSoon()` 兜底，**用户点击只看到"敬请期待"**。

修复方式：在 `src/utils/router.ts` 的 ROUTE_MAP 末尾**集中加了一个带 `断链修复` 注释的别名块**（搜 `断链修复` 即可定位）。修复的 7 条：

| proto 路径 | 映射到的 vue 页 | 触发场景 |
|---|---|---|
| `/discover` | `/pages/discover/index`(tab) | 收藏/下载空态「去发现内容」 |
| `/profile` | `/pages/profile/index`(tab) | 扫码结果/帮助页跳个人中心 |
| `/courses/study-plan` | `/pkg-course/study-plan/index` | 我的课程→学习计划 |
| `/seckill/rules` | `/pkg-shop/seckill/rules/index` | 秒杀页→活动规则 |
| `/station/earnings` | `/pkg-operator/station-earnings/index` | 站长面板→收益 |
| `/publish` | `/pkg-circle/circles/publish` | 草稿箱→发布 |
| `/content/community-rules` | `/pkg-report/community-rules/index` | 举报详情→社区规范(本轮新迁页) |

> 前 6 条的目标 vue 页**早已存在并在 pages.json 注册**，只是缺别名；第 7 条目标页本轮才迁。`/discover`、`/profile` 是 tab 页，`navigateTo` 内部会识别并走 `reLaunch`。

### E-3. ⚠️ 新旧重复页 / 孤岛页 —— 哪个是对的、哪个该放弃

原型里存在**同一功能的两套页面**（新旧设计并存）。下表说明每组里**哪个是用户实际可达的"活页"、哪个是无入口的"孤岛旧版"**。Claude Code 联调时**优先对接「活页」，孤岛页可暂不接、未来可清理**：

| 功能 | ✅ 活页(用户可达，优先联调) | ⚠️ 孤岛/旧版(无入口) | 判定依据 |
|---|---|---|---|
| **浏览历史** | `/history` → `pkg-mine/browse-history`(分组+多选删除版) | `/mine/history` → `pkg-mine/history`(封面+进度+左滑版) | profile 个人中心「常用功能」菜单(`profile-data.ts`)的「浏览历史」指向 `/history`；`/mine/history` 在原型和 vue 中**均无任何入口**。本轮已补 `/history` 映射修复断链 |
| **我的点赞** | `/likes` → `pkg-mine/likes`(类型筛选Tab+取消点赞版) | `/mine/my-likes` → `pkg-mine/my-likes`(旧版) | profile 顶部「获赞」统计(`profile/page.tsx:214` Link href=/likes)指向 `/likes`；`/mine/my-likes` 在原型和 vue 中**均无任何入口**。本轮已迁 `/likes` 并补映射 |
| **收货地址** | 两套**并存**（按用户决策保留） | — | `/address`(弹窗编辑版,本轮迁) 与 `/shop/addresses`(独立 edit 页版,早前迁) 是原型真实的两套，checkout 页 Link 指向 `/address`。**均保留**，非孤岛 |
| **通知** | 两个**不同功能**，均保留 | — | `/notifications`(通知中心/列表,本轮迁) 与 `/settings/notifications`(通知设置开关) 是不同页，非重复 |

> 📌 **关于孤岛 `/mine/history`**：它有原型依据(`app/mine/history`)、可通过直接 URL 访问，故**本轮未删除**，仅在 `vue3/compare/route-map.json` 对应条目和此处标注为「旧版孤岛」。若产品确认废弃，可由 Claude Code 删除 `pkg-mine/history/` 目录 + 其 pages.json/router.ts/route-map 三处登记。删除前请确认无新增入口。
>
> 📌 **排查局限性说明**：本轮断链排查基于 `navigateTo` **字面量**比对。项目大量使用**变量驱动导航**(`navigateTo(item.path)`)和**直达 `/pkg-*` 路径**，这些无法用静态 grep 完整追踪，因此**不能仅凭"grep 不到引用"就判定某页是孤岛**（会误删可达页）。上表的孤岛判定都经过了多角度三角验证(原型入口 + vue 入口 + 数据文件 link 字段)。新增孤岛判定务必同样审慎。

### E-4. 仍未修复的已知问题（留给 Claude Code）

- `/content/community-rules` 已修复并迁移✅。
- `/likes` 活页已迁移✅(2026-06-22)。
- `/points` 积分中心**已修复断链**✅(2026-06-22)。更正说明：`/points` 页(API 版积分中心)其实**前轮 owner V 已迁好**并落盘 `pkg-mine/points/index`(655行,含 exchange/history/tasks 三个子页，均在 pages.json 注册)，只是 **router.ts 缺 `/points` 系列映射**导致 profile 顶部「积分」+ wallet 页点击断链。本轮补了 `/points`、`/points/exchange`、`/points/history`、`/points/tasks` 四条映射修复。视觉优化：该页 capture diff 已从 **20.30% → 10.01%**——借助 capture 生成的 `output/pkg_mine_points_index__diff.png` 像素高亮图定位到两大差异并修复：①hero 余额卡渐变色不匹配(原型 `from-accent via-accent/80 to-yellow-600`，旧版用偏暗褐 `#b8923f/#a67c1a`→整片标红)，改为 `#c9a96e/#d3b989/#ca8a04` 像素级匹配；②间距小于原型 Tailwind 值致内容上移，对齐 hero-top `mb-2`/hero-stats `mt-4`/section `mt-6`，并补 `.nav` 的 statusBarHeight 适配。剩余 ~10% 为 rpx→px 亚像素取整漂移+中文字形抗锯齿噪声(该对比方法不可约底)。💡 **经验:排查视觉 diff 优先看 `output/<page>__diff.png` 像素高亮图，红色区域即不匹配处，比肉眼猜测高效得多。**
- `/mine/my-comments`+`/mine/received-comments` 已核实✅(2026-06-22)：**无需处理**。三角验证确认无顶级 `/comments` 活页、vue 页已迁、router 映射已存在(176/177行)，但原型和 vue 中均无入口链接(grep 全空)——是原型作者建页未接入口的「完整孤岛对」，非断链，保留即可。
- **运势板块 `/fortune` 已新迁✅(2026-06-22)** + **诗词 `/poetry` 入口断链已修复✅**。详见下方 E-6。
- **至此 profile 菜单/统计指向的活页(history/likes/points)断链已全部修复，`/mine/*` 重复页/孤岛核查全部完成**。古籍下游 `reader/[id]`/`audiobooks/[id]` 仍为 toast 占位属后续批次；电子书 `/ebook/*` 经复核**实际已全迁好**(见第二节末尾更正)，仅缺入口。

### E-5. ⚠️ 重要经验：`@/utils/router` 只导出 4 个导航函数

迁移 `/likes` 时踩过一个坑：误 `import { switchTab }`，但 **router.ts 并没有 `switchTab` 导出**，导致整个页面 chunk 加载失败、H5 端显示 "connection timed out" 白屏(编译无报错，极隐蔽)。

`@/utils/router` **仅有以下导出**，写新页务必只用这些：
- `navigateTo(url)` — 通用跳转；**内部已自动识别 `MAIN_TABS` 并改走 `uni.reLaunch`**，所以跳 tab 页(首页/圈子/排盘/发现/我的)也用它，不要找 `switchTab`
- `redirectTo(url)`、`reLaunch(url)`、`navigateBack(delta)`、`goBack()`
- `resolve(url)`、`toastComingSoon()`

> 排查技巧：H5 页白屏/超时但**编译无错**时，优先怀疑「import 了不存在的具名导出」或「运行时 JS 异常」。用 `agent-browser` 经 `uni.reLaunch` 进入(直接 hash 直链会被 uni 冷启重定向到首页)，对比一个已知正常的同分包页是否也白屏，可快速定位是「页面 bug」还是「环境问题」。

### E-6. 运势板块新迁 + 诗词入口断链修复（2026-06-22）

排查首页金刚区(`components/home/quick-entry-grid.vue`)时发现两个入口 url 错误，都指向**不存在**的 `pkg-classics` 子路径：

1. **诗词「诗词」入口断链 → 已修(改一行)**：url 误写 `/pkg-classics/poetry/index`，但诗词板块**早已完整迁移**在独立分包 `pkg-poetry`(index/categories/collections/detail 全有，owner B)。改为 `/pkg-poetry/index/index` 即修复。⚠️ 教训：原型里 `fortune`/`poetry` 是**顶级板块**(`proto-ref-app/fortune`、`proto-ref-app/poetry`)，**不在 classics 下**，之前的入口 url 把它们错挂到 classics 命名空间了。
2. **运势板块未迁 → 已新迁 `pkg-fortune`**：金刚区「运势」入口指向不存在的页。原型 `proto-ref-app/fortune` 有 3 个页(主页 308行/每日 daily 413行/订阅 subscribe 392行)。本轮迁移了**主页**(`pkg-fortune/index/index`，修复入口断链最关键的一个)，diff **8.44%**(nav:ok，高保真)。
   - 数据：`src/lib/fortune-data.ts`(综合运势/宜忌/四类运势[事业/感情/财运/健康]/幸运信息/今日提醒 + `getFortuneLevelInfo` 等级色 + `formatFortuneDate`)。⚠️ 接后端时替换 `defaultFortune`，保留结构。
   - 新增图标：`briefcase`(lucide，加在 `icons-registry.ts`)。
   - 圆环用 inline SVG `<circle>` 画进度环(uni H5 支持)，评分/等级居中。
   - **下游未迁(toast 占位，属后续批次)**：`/fortune/detail`(详细解读)、`/fortune/daily`(每日)、`/fortune/subscribe`(订阅提醒)。三处注册已补：pages.json(`pkg-fortune`) + route-map(`/fortune`)。

---

## 五、Git 状态
- 所有改动已 commit（工作树干净），通过 v0 的 GitHub 集成同步到连接的仓库分支。
- 累计新增：分站运营商 + 站长后台 24 页 + **古籍板块 5 页**（首页/分类/搜索/详情/书架）。
- 古籍轮新增共享件：**讨论母版 `DiscussionPanel`/`DiscussionSheet` + AI 辅助浮层 `AiAssistPopover`**（跨场景复用）、古籍基础组件(`ClassicsHeader`/`FlatCover`)、数据文件 `classics-data.ts`/`classics-cover.ts`/`discussion-types.ts`/`ai-assist.ts`。
- 古籍下游路由（`reader/[id]` 阅读器、`audiobooks/[id]` 听书）**尚未迁移**，详情页内为 toast 占位，属后续批次。
