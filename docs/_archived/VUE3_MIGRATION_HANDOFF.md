# 热卜国学 (rebu-guoxue) —— Vue3 高保真迁移交接文档

> 本文件是新窗口/新账号开始 Vue3 迁移工作的【唯一总入口】。
> 请先完整阅读本文件，再开始任何编码工作。
>
> ⚠️ **前置必做**：在开始 Vue3 迁移之前，必须先阅读并执行 `DESIGN_AUDIT_AND_FIXES.md`，
> 在 **Next.js 原型**上修复其中的 P0/P1/P2 设计缺陷并通过验收，使原型达到「国际级获奖标准」。
> 修复后的原型才是本次迁移的「黄金参照物」。**顺序：先修原型 → 验收 → 再迁移 Vue3。**

---

## 0. 一句话目标

把本仓库这个**已完成并经过多轮走查优化的 Next.js 移动端 H5 原型**，
**100% 高保真、像素级**还原迁移为 **Vue3** 技术栈。
**这个原型就是唯一参照物和验收标准，不得擅自重新设计或"优化"。**

---

## 1. 当前原型的事实档案（Source of Truth）

| 项目 | 值 |
|:--|:--|
| 项目名 | `rebu-guoxue`（热卜国学，国学/玄学内容 + 电商平台） |
| 技术栈 | Next.js (App Router) + React + TypeScript |
| 样式 | Tailwind CSS v4（无 tailwind.config.js，token 全在 `app/globals.css`） |
| 组件库 | shadcn/ui（new-york 风格，基于 Radix UI） |
| 提示 | sonner（Toaster 挂载在 `components/providers.tsx`） |
| 图标 | lucide-react |
| 图表 | recharts |
| 轮播 | embla-carousel |
| 路由总数 | **531 个 `page.tsx`** |
| 组件总数 | **182 个 `.tsx` 组件** |
| 验收视口 | 移动端竖屏 **514 × 1111 CSS px**（原型按此优化） |

### 关键目录
- `app/**/page.tsx` —— 所有页面路由（App Router 文件路由）
- `components/` —— 共享组件，已按板块分组（见下）
- `components/ui/` —— shadcn/ui 基础组件
- `components/cards/` —— 统一卡片库（CourseCard / ProductCard / VideoCard / LiveCard 等，含 feed/list/rail/rank 变体）
- `components/common/back-button.tsx` —— 统一返回按钮（带 history 检测 + fallbackPath 兜底）
- `app/globals.css` —— 设计 token、动画、字体的唯一来源
- `app/layout.tsx` —— 根布局与字体

---

## 2. 设计系统（必须 1:1 复刻）

### 2.1 品牌色（故宫红体系，浅色模式）
```
--gugong-red:      #c41e3a   /* 品牌主色 primary，全站统一，使用约 1600+ 次 */
--gugong-red-soft: #d94452
--gugong-red-deep: #a01830
--jewel-gold:      #c9a96e   /* accent 强调色（宝石金） */
--xuan-paper:      #faf8f5   /* background 宣纸底色 */
--xuan-paper-2:    #f5f1eb   /* secondary */
--xuan-paper-3:    #f0ebe5   /* muted */
--ink:             #2c2c2c   /* foreground 墨色 */
--ink-2:           #666666
--ink-3:           #999999   /* muted-foreground */
--hairline:        #e8e0d5   /* border 细线 */
--pure-white:      #ffffff   /* card */
--state-red:       #ff4d4f   /* destructive 警示 */
--radius:          0.5rem
```
- 语义 token：`--primary=故宫红`、`--background=宣纸`、`--foreground=墨色`、`--accent=宝石金`。
- **支持深色模式**（`.dark`），迁移时一并复刻（深色值见 `globals.css` 第 230-290 行）。

### 2.2 字体
- 中文正文：`Noto Sans SC`，衬线（标题/古典感）：`Noto Serif SC`，等宽：`JetBrains Mono`。
- 注意：`app/globals.css` 的 `@theme` 里 `--font-sans` 已指向 Noto Sans SC，但 `layout.tsx` 还引入了 Geist；Vue 侧请以 **Noto Sans SC / Noto Serif SC** 为准。

### 2.3 自定义动画（在 globals.css，需复刻为等价 CSS）
`fly-to-cart`(加入购物车飞入)、`fade-in`、`pulse-fast`、`shake`、`shimmer`(按钮闪光)、`marquee`(跑马灯)、`.masonry-grid`(瀑布流布局)。

### 2.4 设计红线（走查中已修复，迁移时不可回退）
1. **严禁紫色作为品牌主色**（AI 徽章、主按钮、工具卡等一律故宫红 `bg-primary/15 text-primary` 或实心 primary）。紫色仅可用于图表数据系列、分类色标等功能性区分。
2. **所有提示统一走 toast**（原型 sonner → Vue 用 `vue-sonner`），不得用原生 `alert/confirm`。
3. **返回按钮必须带 fallback 兜底**：可冷启动直达的详情/分享页（文章、课程、商品、智能体对话等），无历史时回退到对应列表页。
4. **不得有死链**：原型已逐一修复路由笔误（如 `/auth/login`→`/login`、`/membership`→`/vip`、`/mine/wallet/*`→`/wallet/*` 等），迁移路由映射时务必保持正确。

---

## 3. 业务板块清单（按此分批迁移）

顶层板块目录（`app/` 下）共约 90 个，建议按以下功能域分批：

- **首页/发现**：discover, splash, welcome, search
- **课程**：courses（聚合首页）, courses-list, course, learn, learning
- **商城**：mall（聚合首页）, shop, cart, checkout, flash-seckill(seckill/flash-sale), orders, aftersale, coupons, address
- **圈子/社区**：circle, circles, my-circles, post, article, articles, topic, topics, qa
- **排盘/玄学**：paipan, bazi, qimen, yangpan, fortune, result
- **直播/音视频**：live, video, videos, call
- **电子书**：ebook, reader
- **IM/消息**：im, chat, messages, contacts, notifications, notices, notice, announcements
- **智能体 AI**：agent, agents, bots, ai
- **个人中心**：mine, profile, wallet, points, withdraw, favorites, follows, likes, history, downloads, drafts
- **创作者/商家/讲师**：creator, merchant, teacher, teacher-certification, expert, experts, authors, operator, station, offline, manage, earnings
- **会员/活动**：vip, renew, activity, competition, bounty, tasks, check-in, invite
- **认证/登录**：auth, login, register, forgot-password, verification, interests-guide
- **法务/帮助**：legal, privacy, policy, terms, agreement, help, customer-service, feedback, report, appeal, compliance
- **其它**：classics, poetry, institute, ranking, rankings, same-city, share, poster, demo, design, error, error-pages

> `components/` 已按板块分组（bazi, cards, circle, classics, course, courses, ebook, home, live, mall, marketing, membership, merchant, paipan, station, wallet, ui, layout, common, dialogs, skeletons, illustrations 等），可与页面板块对应迁移。

---

## 4. 推荐技术选型对照（如有更优可提议，但需说明理由）

| 原型 (Next.js) | Vue3 迁移建议 | 说明 |
|:--|:--|:--|
| Next.js App Router | **Vite + Vue 3 + TS**（或 Nuxt 4 文件路由） | 需 SSR/SEO 选 Nuxt，纯 H5 选 Vite + Vue Router |
| React | Vue 3 `<script setup>` | SFC 单文件组件 |
| Tailwind CSS v4 | **Tailwind CSS v4**（直接复用 globals.css token） | token 体系几乎零改动 |
| shadcn/ui (Radix) | **shadcn-vue**（基于 Reka UI）或 Nuxt UI | shadcn-vue 与原型最对齐 |
| sonner | **vue-sonner** | toast API 基本一致 |
| lucide-react | **lucide-vue-next** | 图标名一一对应 |
| recharts | **vue-echarts** / unovis | 需��证图表视觉一致 |
| embla-carousel | **embla-carousel-vue** | 同一引擎，无缝迁移 |
| next/image | `<img>` + 懒加载，或 Nuxt Image | 注意保持尺寸/裁切一致 |
| next/link, useRouter | Vue Router `<RouterLink>` / `useRouter` | 路由映射见第 3 节 |

---

## 4.5 代码生成输出规范（Claude Code 指定 · 每个 .vue 文件必须严格遵守）

> 你是前端设计稿转代码专家。将给定的设计稿（= 本仓库 Next.js 原型页面）转换为
> **Vue3（Composition API + `<script setup lang="ts">` + Tailwind CSS）** 代码。

### 核心原则：只做 UI 壳，不碰数据和业务
- 所有数据在组件内用 **mock 常量**定义，**不发起任何 API 请求**。
- 不写 `fetch` / `axios` / `useQuery` 等数据获取逻辑。
- 交互逻辑正常实现（弹窗开关 / 列表筛选 / Tab 切换 / 表单输入等），但**数据源一律为本地 mock**。
- Mock 数据结构尽量贴近真实场景，字段命名语义化。

### 质量要求
1. **100% 视觉还原**：每个 section、每个组件、每个状态必须精确对应原型；不自行增减功能、不简化交互、不替换设计元素。
2. **状态全覆盖**：`loading / empty / error / success` 四态及组件特殊状态。用 `ref` 定义状态，`v-if/v-else-if/v-else` 条件渲染。
3. **交互完整**：点击 / hover / 弹窗 / 抽屉 / 底部面板 / 表单 / 列表刷新加载更多。用 `@click` / `@change` 事件绑定，`v-for` 列表渲染。
4. **代码规范**：
   - 纯 Tailwind CSS，**不写自定义 CSS 类名和 `<style>` 块**。
   - TypeScript，类型定义完整。
   - **单文件不超 400 行**，超出拆子组件。
   - **内联 SVG，不引入图标库**。
   - 不写无关注释，移除 `console.log`。
5. **多设备适配**：优先移动端 **375–414px**，用 Tailwind 响应式断点适配平板和桌面；移动端触摸区域 **≥44px**，注意安全区。
6. **交付标准**：每个页面独立 `.vue` 文件，可独立运行；数据全 mock，无外部依赖。

> 目标：Vue3 格式明确、mock 边界清晰，交付后直接接 API 和平台适配即可。

### ⚠️ 与本文档其它条款的协调说明
- 本节"内联 SVG，不引入图标库"是 **Claude Code 的硬性输出要求**；若与第 4 节"lucide-vue-next"冲突，**以本节为准**（图标一律内联 SVG，从原型的 lucide-react 图标导出等价 SVG path）。
- 本节"只做 UI 壳 + 全 mock 数据"是当前阶段的明确边界：**先 100% 还原 UI 与交互，不接任何后端**。
- 设计红线（第 2.4 节：禁紫色品牌色、统一 toast、返回兜底、无死链）在"纯 UI 壳"前提下**依然全部适用**。

---

## 5. 迁移前必须先产出（经我确认后再编码）

1. **接入参照物**：把本仓库作为只读参照克隆/挂载，通读 `app/globals.css`、`components/`、`app/**/page.tsx`。
2. **迁移计划**：分阶段计划（技术选型对照、设计系统迁移、组件库映射、路由映射、页面分批顺序）。
3. **保障措施**：把"如何确保 100% 高保真"落实为**可执行机制**（见第 6 节）。

---

## 6. 100% 高保真保障措施（必须落地为机制，不能只是口头承诺）

1. **全量清单 checklist**：建立覆盖全部 **531 路由 + 182 组件**的清单，逐项标记 `未开始/进行中/已还原/已比对验收`，实时更新。
2. **逐页视觉比对**：对原型与 Vue 版本在 **514×1111** 视口同路由截图，做并排/像素 diff，差异修复至一致。建议用 **Playwright** 批量截图。
3. **自动化（明确允许且推荐制作脚本/工作流/技能）**：
   - 路由清单生成脚本：扫描 `app/**/page.tsx` 自动生成路由表 + 待迁移清单 + Vue Router 路由映射草稿。
   - 截图比对工作流：批量对两套站点同路由截图并生成 diff 报告。
   - "高保真还原"技能(skill)：沉淀迁移规范、组件映射表、验收标准，保证每页执行一致。
4. **构建守门**：每完成一批，运行 Vue `build` 确保零错误，并在真实浏览器验证交互（点击/跳转/表单/弹层/toast/冷启动返回）。
5. **设计红线校验**：迁移后全局搜索紫色品牌色违规、原生 alert/confirm、死链、无兜底返回，确保为零。

---

## 7. 验收标准（DoD）

- [ ] 全部 531 路由均有对应 Vue 页面且可访问，无死链。
- [ ] 逐页视觉比对一致（差异截图归零，或仅余可解释的字体渲染级差异）。
- [ ] 全部交互行为与原型一致：toast、弹层、表单校验、分享冷启动返回、购物车飞入动画等。
- [ ] 设计 token / 故宫红 / 字体 / 深色模式 1:1 还原。
- [ ] Vue 项目 `build` 通过、控制台无报错。
- [ ] 每个页面为独立 `.vue` 文件（`<script setup lang="ts">` + 纯 Tailwind，无 `<style>`），单文件 ≤400 行。
- [ ] 数据全部为本地 mock，无任何 API 请求 / `fetch` / `axios`；图标全部内联 SVG。
- [ ] `loading / empty / error / success` 四态齐全；触摸区域 ≥44px，安全区适配。

---

## 8. 历史走查成果（迁移时请保持，勿回退）

本原型在交接前已完成多轮专项走查与修复：
- 课程首页、商城首页：从"列表页/内容板块"升级为**聚合型门面**（Banner、分类导航、营销活动区、秒杀倒计时、拼团、专栏推荐等）。
- 全站 **AI 徽章紫色违规** → 统一故宫红。
- 排盘结果页/智能体工具卡的**紫色主按钮/卡片** → 统一故宫红。
- 全站**死链**（路由笔误）批量修正。
- 关键分享详情页**返回逻辑**加冷启动兜底。
- 全站 **alert/confirm** → 统一 sonner toast；旧 `useToast`(shadcn) 路径清除。
- 所有 `useSearchParams` 页面补齐 **Suspense** 边界，生产构建通过。

---

## 9. 开始指令（给新窗口助手）

> 请先接入本原型参照物，然后输出【迁移计划 + 保障措施 + 自动化方案】给我确认，
> **再开始编码。不要跳过计划阶段直接写页面。**
> 迁移过程中，遇到任何与原型不一致的地方，一律以原型为准。
