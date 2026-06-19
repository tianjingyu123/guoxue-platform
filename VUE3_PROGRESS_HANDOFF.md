# Vue3 高保真迁移 —— 进度交接 / 接力清单

> 本文件用于**跨 v0 账号接力**。新窗口接手前，**必须先读** `VUE3_MIGRATION_HANDOFF.md`（原始工作规范，仍在仓库中，未改动），再读本文件了解进度与已知问题。
> 本文件只记录"进度 + 错误 + 待办"，不覆盖原规范。原规范与本文件冲突时，**以原规范为准**。

---

## 0. 仓库与分支状态（务必先确认）

- 当前工作分支：`v0/tjy13230611620-4673-33c78a8e`
- 截至交接：**本地领先远程 11 个提交，尚未推送到 GitHub**。
- v0 沙箱内的 `origin` 是临时 bundle，无法在沙箱里直接 `git push` 到 GitHub。
  **上 GitHub 的正确方式**：在 v0 界面右上角 **Settings → Git** 连接 GitHub 仓库，v0 会自动把本分支推送上去。
- 所有改动均已 `git commit`，工作树干净，不会丢失。
- 工作规范文档 **仍在仓库**：`VUE3_MIGRATION_HANDOFF.md`（已确认 `git ls-files` 可见）。

---

## 1. 截图比对的硬性标准（最重要，先记住）

来自原规范第 6 节，第 169 行：

> 逐页视觉比对：对原型与 Vue 版本在 **514×1111 视口**、**同路由**截图，做并排/像素 diff，差异修复至一致。

- **比对视口固定为 514×1111**（不是 375）。375–414 仅是移动端设计目标宽度，**验收截图必须用 514×1111**。
- 原型 dev 跑在 `http://localhost:3000`，vue3 dev 跑在 `http://<NetIP>:5173`（NetIP 见 `/tmp/vue3-dev.log`，形如 `http://100.x.x.x:5173`）。
- agent-browser 截图前**每次都要重新 set viewport 514 1111**（切换页面后视口会丢）。
- 原型部分动态详情页（带 `[id]`、依赖数据）在 dev 下会渲染成空态或回退首页——**这类页不能用截图当基准**，要改用"读原型源码结构 + vue3 截图"双向核对。

---

## 2. 已完成的工作（已提交）

### 2.1 全局修复
- `vue3/src/App.vue`：补全局 `box-sizing: border-box`。此前缺失导致所有页 padding 撑宽、横向溢出。**这是影响全站的根因修复。**

### 2.2 统一导航栏组件
- `vue3/src/components/common/app-nav-bar.vue`：统一返回导航栏组件。
  - 支持 props：`title`、`back-icon`、`back-size`、`title-align`、`background`、`no-border`、`bar-height`、`color`、`serif-title`。
  - 支持插槽：`#right`（右侧操作区）、`#center`（中间自定义，如积分页 Tab）。
  - 复合 header 页（导航行 + 下方 Tab）用 `background="transparent" no-border` 让组件只做布局，外层保留 sticky/blur。

### 2.3 已接入 app-nav-bar 并经核对的页面（38 个页面接入）
> 注：接入组件 ≠ 全部做过 514×1111 严格像素 diff。下面标注核对程度。

**个人中心（截图核对过）**：settings、security、history、bind-accounts、privacy-authorization、teen-mode、delete-account、received-comments、change-password、change-phone、payment-password、blacklist、wallet、points（center 插槽 Tab）、my-likes、my-comments、data-export、pages/profile/edit
**订单售后（vue 截图 + 原型源码结构核对）**：order/center、order/list、order/detail、logistics、refund、review、dispute、invoice
**商城（截图核对过）**：cart、checkout、categories、payment-methods、compare、coupon-detail、exchange、reviews、product（沉浸式）
**主 Tab（截图核对过）**：index、circles、paipan、discover、profile

### 2.4 本轮修复的具体保真问题
- `profile/edit`：性别/生日/所在地字段，原型是**居中两行堆叠**（Card 基类 `flex-col items-center` 覆盖了内联 justify-between），原 vue3 是单行左右 → 已改为 `flex-col` 居中。
- `payment-methods`：标题"支付方式管理" → 改为"支付方式"；返回图标 `arrow-left` → 改为 `chevron-left`（与原型一致）。
- `delete-account-result`：冷静期态原为纯全屏 hero 无法返回，原型同页有返回入口 → hero 左上叠加沉浸式白色返回箭头。
- `circles`（圈子 Tab）：原 vue3 顶栏多了个红色"创建"按钮，原型顶栏只有搜索+日历，创建入口是**右下角悬浮 FAB** → 移除顶栏按钮，新增 `from-#C41E3A to-#A01530` 渐变圆形 FAB（`right-4 bottom-24`，48×48）。

### 2.5 有意保留的沉浸式页（**不要改成白底标准导航**）
经原型源码核对，以下页是彩色 hero + 白色返回图标的沉浸式设计，**自绘导航是正确的**：
- `pkg-shop/coupons`（红色 hero）、`pkg-shop/flash-sale`、`pkg-shop/group-buy/index`、`group-buy/detail`、`group-buy/success`、`group-buy/fail`（灰色渐变 `from-gray-500 to-gray-600`）、`pkg-shop/product`（沉浸式图轮播）。

---

## 3. 尚未完成 / 未严格核对的工作（下个窗口重点）

### 3.1 首页头部 app-header（**最大的已知保真缺口，尚未修复**）
- 文件：`vue3/src/components/app-header/app-header.vue`
- 原型 `components/app-header.tsx` 的真实结构：
  1. 搜索栏行（h12）：AI 搜索框（放大镜 + 故宫红"AI"徽章 + "AI搜索平台全部内容…"）+ 智能客服图标（MessageCircle）+ 消息铃铛（未读红点）。**无品牌 logo**。
  2. 内容分类 Tab 行（h10）：**推荐 / 关注 / 热门 / 直播 / 同城**（激活态主色 + 3px 下划线）+ 右侧"+"自定义频道。
- vue3 现状：红色"热卜国学"logo + 普通搜索框（"搜索国学内容"）+ 单个铃铛。**缺 AI 徽章、智能客服图标、整个内容分类 Tab 行。**
- 注意：`discover` 页已经实现了 AI 搜索框 + 分类 Tab，可作为实现参考。

### 3.2 死链路由（首页 app-header 内）
- 首页搜索/铃铛指向 `/pkg-im/search`、`/pkg-im/conversations`，这两个路由**不存在**，点击无响应。
- vue3 实际只有 `pkg-circle/circles/search`、`pkg-agent/agent/customer-service`。需重新指向或加占位。

### 3.3 还有约 56 个页面未做 514×1111 严格像素 diff
- vue3 共 **94 个页面**，仅 38 个接入统一导航栏，其中真正做过截图比对的更少。
- **未系统核对的模块**（需逐页 514×1111 比对）：
  - `pkg-circle/*`（圈子详情、发帖、话题、活动、日历、earnings、level 等）
  - `pkg-agent/*`（智能体对话、客服、列表）
  - 课程 / 直播 / 古籍馆 / 诗词 / 笔记 / 收藏 / 电子书 等内容模块
  - `pkg-shop` 其余页（flash-sale、group-buy 系列只确认了沉浸式导航，**内容区未逐项 diff**）
- `pkg-circle/circles/earnings.vue`、`pkg-circle/circles/level.vue`、`pages/paipan/index.vue` 仍有自绘导航，需确认是否沉浸式或待迁移。

---

## 4. 我（上个窗口）犯的错误 —— 供改正

1. **截图视口不统一**：规范明确要求 **514×1111**，我前期多次用 375×812 验证，早期提交信息甚至写"@375对齐原型"。下个窗口务必固定 514×1111。
2. **重导航栏、轻内容**：我把大量精力放在"统一导航栏"上，但规范要求的是**每页 100% 像素级还原**（每个 section/组件/状态）。导航只是其中一小部分，内容区差异核对严重不足。
3. **未优先处理最大缺口**：首页 app-header 这种显眼的核心差异，拖到很后面才发现，应当一开始就做全站差异扫描、按影响排序。
4. **依赖不可靠的截图基准**：部分原型动态页 dev 下是空态/回退，我一度照着错误截图判断，浪费了来回。应先识别"哪些原型页 dev 可靠"。
5. **没有先建批量截图比对脚本**：规范第 6 节要求把"高保真保障"落实为**可执行机制（Playwright 批量截图 + diff）**。我一直手动逐页截图，效率低、覆盖不全。**这是下个窗口应最先补上的基础设施。**
6. **改动比对粒度粗**：有些"已接入组件"的页我只看了导航没逐 section 比对内容，可能仍有未发现的内容差异。

---

## 5. 下个窗口的执行顺序建议

1. 读 `VUE3_MIGRATION_HANDOFF.md`（原规范）+ 本文件。
2. **先建批量截图 + diff 脚本**（Playwright，514×1111，原型 3000 / vue3 5173 同路由），产出 diff 报告——把"保真"变成可量化机制。
3. 用脚本对 **94 个页面**全量跑一遍，按差异大小排序。
4. **优先修首页 app-header**（§3.1）+ 死链路由（§3.2）。
5. 按 diff 报告逐页修复内容区差异，每页修完重新截图确认归零。
6. 保留 §2.5 列出的沉浸式页设计，不要误改。
7. 全部归零后，在 v0 Settings → Git 连接 GitHub 推送。

---

## 6. 关键命令速查

```bash
# vue3 dev 的 NetIP
grep -oE 'http://100\.[0-9.]+:5173' /tmp/vue3-dev.log | head -1

# 找仍有自绘导航未接入组件的页
cd vue3/src && for f in $(find pages pkg-* -name "*.vue"); do
  grep -q 'app-nav-bar' "$f" && continue
  grep -qE 'class="nav-bar"|class="navbar"|nav-title|class="header"' "$f" && echo "$f"
done

# 已接入组件的页数
grep -rl 'app-nav-bar' pages pkg-* | wc -l

# 单文件 SFC 编译自检（沙箱里 /tmp/sfc-check/check.cjs）
node /tmp/sfc-check/check.cjs <abs-path-to.vue>
```
