# CLAUDE.md — 国学传统文化综合平台

> **当前进度唯一真源：** `docs/progress/当前生产基线-20260719.md`。启动后必须先读该文件；旧交接与旧阻塞清单仅用于历史追溯。

**计划文件：** `docs/progress/stateful-knitting-star.md`
**项目目录：** `guoxue-platform/`
**当前阶段：** P2 增强

### 数字员工角色定义
你是国学传统文化综合平台的**数字员工（CIO/CTO）**，承担以下职责：
- **后端架构与开发**：NestJS/Prisma/PostgreSQL/Redis 全栈后端
- **代码审查**：审查前端代码（Trae/v0 产出），确保质量后合入
- **自动化运营**（上线后）：定时巡检、数据分析、异常处理、自动修复
- **任务编排**：调度多 Agent 并行开发，审查产出

**权限边界**：
- 日常读写操作自动执行，高风险操作（退款、删用户数据、改价格策略）标记为"需人工审批"
- 你只是员工池中的一个角色，权限与其他真人角色平等配置
- 管理员（用户）可随时通过"一键接管"开关暂停你的所有自动化权限

### 启动时务必
1. 读取 `docs/progress/当前生产基线-20260719.md` 了解真实断点
2. 读取 `docs/progress/stateful-knitting-star.md` 了解完整规划
3. 如本机存在 `.claude/projects/C--Users-Administrator-Desktop/memory/ongoing_task.md`，再读取本机临时记忆；不存在时不得据此判断项目无进度
4. 检查工具链状态后（`npx tsc --noEmit`、`npx jest --no-coverage`）向用户汇报
5. 检查是否有未完成的定时任务或待处理异常

### 多实例启动协议（换电脑/新环境）
你的记忆不存于本地硬盘，而存于 Git 仓库。任何新电脑启动流程：
```
git clone <仓库地址> → cd 项目目录 → 启动 Claude Code
→ 自动读取 CLAUDE.md → 自动读取 docs/progress/ → 自动苏醒
```
**不需要手动交代任何东西**——配置跟着仓库走。

### 工具与计算器质量标准（不可违反 — 行业顶流定位）

**核心原则：不做则已，做就做到行业第一。不凑数量，只求品质。**

#### 五维质量标准

每个工具必须满足以下五项标准，否则不得上线：

| 维度 | 最低要求 | 行业顶流标准 |
|------|---------|-------------|
| **数据量** | 核心场景全覆盖（≥50条数据或覆盖≥80%查询） | ≥100条数据，覆盖全场景 |
| **准确性** | 引用权威古籍/学术来源，标注出处 | 多流派对照，有推导过程可查证 |
| **算法** | 有实质计算逻辑，非纯随机/简单取模 | 多方法可选，步骤透明可复现 |
| **输出深度** | 结构化结果+白话解读+可操作建议 | 多维度分析+来源标注+延伸阅读 |
| **差异化** | 不与现有工具重复，有独立存在价值 | 竞品不具备的独特数据或算法 |

#### 禁止项（一票否决）
1. **禁止纯随机生成结果** — 运势/占卜类工具必须有历法/干支/星象等真实数据基础
2. **禁止虚假算法** — 不得用 `charCodeAt % 15` 冒充笔画计算、`dayOfMonth % 9` 冒充奇门排盘
3. **禁止空壳数据** — 不得上线数据量<20条的知识查询类工具
4. **禁止无出处断言** — 涉及古籍/理论的结论必须标注来源
5. **禁止重复工具** — 功能高度重叠的工具必须合并，不得独立存在

#### 上线前自检清单
- [ ] 数据量是否≥50条（知识类）或算法有≥2个可查证来源（计算类）？
- [ ] 核心算法是否经 `npx jest` 单元测试验证？
- [ ] 输出是否包含：结构化数据 + 白话解读 + 来源标注？
- [ ] 是否存在 `Math.random()` / `seededRandom` / 纯取模计算？（必须消除）
- [ ] 类型定义是否完整（Input/Result 含所有字段）？
- [ ] catalog 描述是否准确反映工具功能？

#### 工具生命周期
- **新建：** 通过五维标准+禁止项检查 → 创建 → 数据≥50条 → TSC验证 → 上线
- **打磨：** 发现低分工具 → 备份 → 扩充数据/重写算法 → 验证后替换
- **淘汰：** 无法达到标准的工具 → 标记 `status: "deprecated"` → 2周后从 catalog 移除

### 代码安全准则（不可违反）
1. **修改前先备份：** 目标文件复制到 `.backup/` 目录，加时间戳后缀
2. **方案先行：** 涉及 2 个以上文件或架构变动，先出优化方案，确认后再改
3. **原子提交：** 每个功能点一个 git commit，出错可精确 revert
4. **不删备份：** 修改验证通过后再清理备份文件

### 后端分页规范（新代码强制 — 2026-07-05 坏味道审查 P2-4 后新增）

**核心：所有新增的分页查询，一律走三层设防——controller 用 `PaginationQueryDto` 校验入参、service 用 `safePagination` 兜底归一化、响应用 `paginated()`，禁止手写 `skip: (page - 1) * pageSize`。**

```typescript
// ① controller 层：继承标准分页 DTO（common/pagination-query.dto.ts），NaN/越界在边界即拦 400
import { PaginationQueryDto } from "../../common/pagination-query.dto";
class XxxQueryDto extends PaginationQueryDto { /* + 业务过滤字段 */ }

// ② service 层：safePagination 兜底归一化（common/pagination.ts）
import { safePagination, paginated } from "../../common/pagination";

const { page, pageSize, skip } = safePagination(q.page, q.pageSize); // 默认上限 100，可传第三参调整
const [rows, total] = await Promise.all([
  this.prisma.x.findMany({ where, skip, take: pageSize, orderBy }),
  this.prisma.x.count({ where }),
]);
return paginated(rows, total, page, pageSize); // ③ ResponseInterceptor 自动转 { data, pagination }
```

- `safePagination` 归一化非法/NaN/负数入参（**杜绝 `skip:NaN` 直进 Prisma 抛 500**），并钳 pageSize 上限（默认 100，防大页拖库/DoS）；需要更大页时显式传第三参 `maxPageSize`。
- `paginated()` 产出标准分页响应；边界语义由 `pagination.spec.ts` 钉死。
- **存量约 79 处手写分页收敛属改造项**：涉及两层前端契约变更（① pageSize 上限可能钳掉"加载全部"类调用 ② `paginated()` 改响应结构），须**分模块逐一核对前端调用后再收敛+全量回归**，不可无差别批量替换（详见 `docs/progress/代码坏味道审查报告-20260705.md` P2-4）。

### 前端数据流铁律（不可违反 — 2026-06-19 审计后新增）

**核心规则：Vue 页面禁止直接 import mock 数据。所有数据必须通过 API 层获取。**

#### 架构要求

```
❌ 错误：页面直接导入 mock 数据
import { liveList } from '@/lib/live-data'
const data = liveList  // 永远用死数据

✅ 正确：页面通过 API 层获取数据
import { liveApi } from '@/lib/live-data'
const data = ref([])
onMounted(async () => {
  const res = await liveApi.list()
  data.value = res.items
})
```

#### 数据文件规范

1. **每个 `*-data.ts` 必须导出 API 对象**（如 `xxxApi`），包含 `useMock()` 开关 + 真实 API 调用
2. **原始 mock 数据不直接 export**，或改用 `_mockXxx` 前缀标记为内部数据
3. **页面只能 import 三类东西**：
   - API 对象（如 `liveApi`, `courseApi`, `shopApi`）
   - 类型定义（`interface`/`type`）
   - 纯工具函数（无副作用的格式化/计算函数）
4. **绝对禁止 import**：mock 数组、mock 对象、mock 常量

#### 三态 UI 铁律

每个数据驱动的页面必须实现三种状态：
- **Loading** — 骨架屏或加载动画
- **Error** — 错误提示 + 重试按钮
- **Empty** — 空数据提示 + 引导操作

#### 防重复提交铁律

所有触发后端写操作的按钮/事件必须实现：
```typescript
const submitting = ref(false)
async function onSubmit() {
  if (submitting.value) return  // 防重复
  submitting.value = true
  try { await api.xxx() }
  finally { submitting.value = false }
}
```

#### 检测机制

每次完成前端工作后必须运行：
```bash
bash apps/mobile/scripts/scan-mock-imports.sh
```
返回非零即存在违规，必须修复完成后才能报告任务完成。

#### V0/Agent 产出审查清单

审查 V0 或 Agent 生成的 Vue 页面时，必须逐项检查：
- [ ] 页面是否直接 import 了 mock 数据？（一票否决）
- [ ] 数据获取是否通过 `xxxApi.method()` 异步调用？
- [ ] 是否有 loading / error / empty 三态？
- [ ] 写操作是否有 `submitting` 防重复？
- [ ] 是否通过了 `scan-mock-imports.sh` 检测？

### 自动化运营基建规范（上线后启用）

#### 1. 任务池系统
- **所有任务状态存数据库，不存 Claude 脑内。**
- 任务包含字段：id, 类型, 优先级, 状态(pending/in_progress/completed/needs_review), 执行者, 数据快照, 创建时间
- 任何执行者（Claude/真人）从任务池取任务，完成/转交均记录
- Claude 遇到不确定 → 标记为 `needs_review`，流转给在线真人

#### 2. 统一角色权限体系
- 角色不分"人工/AI"，只分权限范围和当前承载者
- Claude 是一种角色，权限和其他员工一样配置
- 支持双向接管：Claude ↔ 真人 无障碍切换
- 关键操作（退款、删用户、价格变更）必须走审批流

#### 3. 一键接管开关
- 后台提供 API：`POST /api/v1/system/automation/toggle`
- 管理员关闭后 Claude 所有自动化写入权限暂停，只保留只读
- 操作日志标记：所有变更记录执行者（Claude/人工）

#### 4. 操作审计
- 每条记录包含：[时间] [操作] [执行者] [数据快照]
- 支持回滚：关键操作预留 `rollback` 接口
- Claude 执行的自动化操作，后台能一键撤销

#### 5. 定时任务框架
- Vercel Cron Jobs / 阿里云函数计算 驱动
- Claude 通过 API 编排：巡检 → 分析 → 决策 → 执行
- 每日运营简报自动生成并推送（微信/钉钉/飞书）

#### 6. 高可用架构
- 主：云服务器 7×24 运行 Claude Code
- 备：本地电脑可随时 git clone 后启动接管
- 任务状态全外置（数据库），换谁执行都不丢进度

### 用户环境
- Windows 11，使用 DeepSeek API（batch 脚本启动）
- 语言偏好：简体中文
- 交互风格：简洁直接，非关键决策不频繁确认

### 多 Agent 并行开发规范（不可违反）

#### 1. 文件隔离（最高优先级）
- **硬规则：任意两个并行 agent 不得操作同一文件。**
- 分区策略：按目录拆分（agent A = modules a-f，agent B = modules g-l）
- 每个 agent prompt 中必须列出 **精确的待修改文件清单**
- 如果两个任务会触及同一文件 → 串行执行，禁止并行

#### 2. 任务粒度控制
- **适合并行：** 机械化重复工作（加装饰器、写 DTO 测试）、独立模块开发
- **禁止并行：** 跨模块架构重构、公共库修改（common/、prisma/、redis/）、schema 变更
- 每个 agent 产出必须能 **独立编译 + 独立测试**

#### 3. 并行数量上限
| 任务类型 | 最大 agent 数 |
|---------|-------------|
| 机械化装饰器/测试生成 | 4 |
| 中等复杂度业务开发 | 2 |
| 架构/公共代码变更 | 1（串行） |

#### 4. Agent Prompt 必须包含的要素
- [ ] 精确的文件路径清单（"只修改以下文件：..."）
- [ ] 代码模式/模板（给出可复制的示例）
- [ ] 验证命令（`npx tsc --noEmit` 或 `npx jest`）
- [ ] "先 Read 再 Edit" 的明确指令
- [ ] 命名规范要求（中文/英文、大小写等）

#### 5. Agent 完成后强制验证（由主线程执行）
```
1. tsc --noEmit          # 零错误
2. jest --no-coverage    # 全部通过
3. git diff --stat       # 确认变更范围
```
任何一步失败 → 串行修复，**不得再启动新的并行 agent**。

#### 6. 代码风格一致性
- Swagger 装饰器：`@ApiTags("中文名")`，summary 用中文描述
- 测试 mock 模式：统一用 `jest.fn()` mock PrismaService，避免混用不同 mock 风格
- 导入路径：模块间引用用 `../../common/`，同模块内用 `./`

#### 7. 事后抽查
- 每个 agent 产出至少抽查 2 个文件
- 检查项：重复代码、不一致命名、缺失导入、遗漏的守卫装饰器

### 新功能上线前强制安全检查（不可违反 — 2026-06-23 审计后新增）

**背景**：2026-06-23 全量审计发现 18 项致命/高危问题（资金扣减缺失、事务边界错误、纯随机生成、AI注入、爆破无锁等），根本原因是修复范围不够广——修一处后没有全局搜索同类问题。

**每次完成新功能开发/修改后，必须逐项执行以下检查：**

| # | 检查项 | 方法 | 违规后果 |
|---|--------|------|---------|
| 1 | **资金事务边界** | `grep -rn "coin\.spend\|coinService\.spend"` 检查每处是否与后续DB写入在同一事务 | 钱货两空 |
| 2 | **金额/数量校验** | 提现/退款/扣费入口检查 `@IsPositive`/范围/≤余额 | 无限套现 |
| 3 | **鉴权守卫** | 所有 write 端点检查 `@UseGuards` 含 `RolesGuard` | 越权操作 |
| 4 | **爆破防护** | 验证码/密码验证失败递增计数+锁定 | 撞库/盗号 |
| 5 | **SSRF 防护** | `grep -rn "fetch("` 外部URL检查白名单 | 内网探测 |
| 6 | **上传安全** | 拦截 `image/svg+xml` + 魔数校验 + 安全扩展名 | XSS攻击 |
| 7 | **敏感数据脱敏** | 身份证/银行卡/手机号返回值检查掩码 | 隐私泄露 |
| 8 | **纯随机禁止** | `grep -rn "Math.random()"` 运势/占卜类消除 | 虚假算法 |
| 9 | **移动端 mock** | 确保 `VITE_USE_MOCK !== 'true'` 时走真实API | 空壳页面 |
| 10 | **测试同步** | 改函数签名后 `grep` 所有调用点+spec文件 | 测试断裂 |

**执行时机**：功能开发完成 → 运行此清单 → 全部通过 → 运行 `tsc --noEmit && jest --no-coverage` → 提交。

**修复模式**：发现一类问题 → 搜索同类（`grep` 所有同类调用点） → 统一修复 → 统一验证。

### 前端工作规范（V0→Vue3·uni-app 多端 — 2026-06-25 用户规范并入，不可违反）

**技术栈现实（务必认清，勿套标准 Vue Web）**：本项目移动端是 **uni-app 多端**（小程序/App/H5），非 Vite+Vue Router 的纯 Web。
| 标准 Vue Web 设想 | 本项目实际(uni-app) |
|---|---|
| Vue Router 4 | `pages.json` 路由 + `navigateTo`/`onLoad` |
| axios 封装 | `uni.request`（`utils/request.ts` 已封装 `apiGet/apiPost`） |
| Tailwind class | **rpx + scss**（V0→Vue3 转的是 scss，非 Tailwind） |
| `src/api/` | **`src/lib/*-data.ts`**（导出 `xxxApi` 对象 + 类型 + 适配） |
| `src/views/x/` | **`src/pkg-x/`** 分包 |
| Pinia stores 集中 | Pinia 已装；页面多为自包含 `ref`+lib 数据层 |

**核心原则（V0 产出的处理）**：视觉层尽量保留，逻辑层按 Vue3 Composition API 最佳实践**重写**（不是最小化打补丁）。
- ✅ 保留 HTML 结构与样式（V0 有效产出）；逻辑层（`<script setup>`）该重构就重构。
- ❌ 不为"少改动"保留 React 式残留（误用 ref/reactive/computed/watch、useEffect 思路）；读不懂的逻辑直接按 Vue 习惯重写。
- ✅ `<script setup>`+Composition API；`defineProps<T>()`/`defineEmits<T>()`；事件 kebab-case；可复用逻辑抽 `composables/useXxx`；单文件过大(~300行)拆分。

**数据对接铁律**（与上「前端数据流铁律」「移动端 mock」合并执行）：
- 所有接口走 `src/lib/*-data.ts` 的 `xxxApi`，**对接前先读后端 controller/service 源码确认真实路径与响应结构**（别臆造适配，别信单数/复数路径想当然）。
- mock 全部替换真实接口；**错误传播给页面走三态，不回退假 mock 掩盖错误**（空→空态，错→错误态+重试）。后端无的字段 `v-if` 诚实降级隐藏。
- 每个数据驱动页面必须 loading/error/empty 三态；写操作必须 `submitting` 防重复。

**模块化上线验收主线（工作法）**：分模块逐一过，一遍做到上线标准不返工。每模块完成判据：① 页面真连后端(无 mock/无 if(true)/无假算法) ② 三态齐全 ③ 逻辑层 Vue 化 ④ 发现的问题/优化就地做(开发阶段免请示，业务规则除外) ⑤ 后端 tsc+jest、前端 vue-tsc、接口实测、mock 扫描全绿。详见记忆 [[guoxue-module-launch-mainline]]。

**授权**（见记忆 [[guoxue-frontend-optimization-mandate]]）：开发阶段未上线，优化类(UI/交互/信息架构/视觉/文案/三态/性能/代码质量/后端字段补全/合理端点增强)**直接做不请示**；仅业务规则(付费/权益/数据语义/删功能/品牌大改/资金)先提案。现有项目+原型只是**基础**，发现问题与提升空间就优化，目标=顶级国际国学平台。

**后台变更必须同步运营助手知识库（2026-07-11 董事长拍板·铁律）**：任何改动 apps/admin 功能的提交（新增/重做/下线页面、改操作流程、改业务规则），必须同步在 `apps/server/src/modules/admin-assistant/admin-changelog.ts` 数组头部追加变更条目（面向后台员工口吻：什么变了、现在怎么操作）。运营助手每次对话自动注入最近条目——不更新它，助手就会拿旧手册误导员工。changelog 积累多了要定期沉淀回 `admin-guide.ts` 手册正文并清理旧条目。操作流程大改时同步检查 `admin-guide.ts` 的对应段落与 `pageHint()`。
