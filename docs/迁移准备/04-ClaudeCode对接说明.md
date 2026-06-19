# Claude Code 前后端对接说明

> 受众：Claude Code（后端实现 / 前后端联调）。
> 目的：让后端按既定接口契约实现 API，前端零改动切换真实接口，平滑联调。
> 本文档随阶段推进持续更新。

## 一、接口契约（已在原型固化，后端按此实现）

### 1. 统一响应信封
所有接口返回统一结构（见 `lib/types/api.ts` 的 `ApiResponse<T>`）：
```ts
interface ApiResponse<T> {
  code: number      // 200 成功；非 200 为错误码（与 HTTP 状态对齐）
  data: T           // 业务数据，失败时为 null
  message: string   // 'success' 或错误信息
}
```
> 后端务必返回该信封；前端 `apiFetch` 会按 `code/data/message` 解析。

### 2. 统一前缀与鉴权
- **Base URL**：环境变量 `NEXT_PUBLIC_API_URL`（Vue3 端对应改为 uni 的 env / config）。
- **路径前缀**：`/api/v1`，前端自动拼接。后端路由按 `/api/v1/<module>/<action>` 组织。
- **鉴权**：需要登录的接口带 `Authorization: Bearer <token>`。token 前端从本地存储取。
- **请求方法封装**：`apiGet / apiPost / apiPut / apiDelete`（见 `lib/api-client.ts`）。
- **FormData**：上传类接口前端发 FormData，后端按 multipart 解析。

### 3. Mock 开关（联调核心机制）
- 前端每个 API 模块用 `NEXT_PUBLIC_USE_MOCK` 控制走 mock 还是真实接口。
- **默认 mock 开启**（演示态）；后端就绪后设 `NEXT_PUBLIC_USE_MOCK=false` 即切真实接口，前端代码零改动。
- ⚠️ **已知不一致**：多数模块用 `!== 'false'`（默认开 mock），但 `lib/api/comments.ts` 用 `=== 'true'`（默认关 mock）。对接时需统一口径，建议全部改为 `!== 'false'`。

## 二、API 模块清单（46 个，后端实现范围）

按业务域分组（详细字段见各模块 import 的 `lib/types/<module>.ts`）：

| 域 | 模块 |
|---|---|
| 用户/账号 | user, user-profile, vip, points, invite, blacklist |
| 学习/课程 | （课程相关散见 app/courses）, achievements, favorites, history, downloads |
| 命理/排盘 | fortune, tools |
| 钱包/交易 | wallet, bank-cards, earnings, creator-revenue, bookings |
| 内容/社交 | comments, likes, messages, notice, report, search |
| IM/客服/机器人 | im, customer-service, bots, circle-bots, station-assistant |
| 直播 | live, station-live |
| 商城/营销 | merchant, marketing, materials, poster |
| 同城/线下 | same-city, offline |
| 平台角色 | operator（运营商）, institute（研究院）, station/station-*（分站）, team, admin |
| 系统 | version, legal, notice, ai-assist, ai-cover, index |

> 每个模块文件结构统一：`import { apiGet/apiPost } → mock 数据 → 导出业务函数（useMock() 时返回 mock，否则调用真实接口）`。
> 后端实现时，**以 `lib/types/<module>.ts` 的类型定义为字段契约**，确保返回结构与前端类型一致。

## 三、数据契约（types 是真相来源）

- `lib/types/` 下 50 个类型文件是**前后端共同的数据契约**。
- 后端返回的 JSON 字段名、类型、嵌套结构**必须与对应 type 完全一致**。
- 联调时如需调整字段，**先改 type，再两端同步**，避免口径漂移。
- 关键示例（成就模块）：`AchievementItem { id, name, description, icon, category, rarity, condition, currentProgress, targetProgress, isUnlocked, unlockedAt, rewardPoints }`。

## 四、联调流程（建议）

1. **后端按模块实现** `/api/v1/<module>/*`，返回 `ApiResponse<T>`，字段对齐 types。
2. **单模块联调**：仅将该模块的 mock 开关关闭（或全局关 + 该模块先就绪），其余继续 mock，逐模块验证。
3. **契约校验**：用 types 做响应校验；不一致时以 types 为准协商。
4. **鉴权链路**：先打通 login → token 存储 → 带 token 请求 → 401 刷新/登出。
5. **全量切换**：所有模块就绪后 `NEXT_PUBLIC_USE_MOCK=false` 全量切真实接口回归。

## 五、Vue3/uni-app 端对接差异（迁移后）

- `apiFetch` 的 `fetch` → `uni.request` 封装（`utils/request.ts`），**保持函数签名与返回信封不变**，后端无感知。
- token 存取：localStorage → `uni.getStorageSync/setStorageSync`。
- 环境变量：`NEXT_PUBLIC_*` → uni 的环境配置（`process.env` 在 uni 下用 `import.meta.env` 或自定义 config）。
- 上传：FormData → `uni.uploadFile`（multipart），后端解析方式不变。
- **接口契约（信封/前缀/鉴权/types）完全不变**——这是双轨结构的红利：后端只面对一套契约。

## 六、后端实现优先级（配合"核心模块先跑通"）

1. 用户/鉴权（user, login, token）—— 联调地基
2. 命理/排盘（fortune, tools）—— 核心功能
3. 课程/成就（courses, achievements）—— 核心功能 + 峰值时刻
4. 钱包/交易（wallet, points）—— 变现链路
5. 其余按模块分包推进

## 七、待后端确认事项（联调前对齐）

- [ ] 统一错误码表（code 含义、401/403/500 处理约定）
- [ ] 分页约定（page/pageSize/total 字段名与 types 对齐）
- [ ] 文件上传上限、图片 CDN 域名（影响 canvas 跨域与小程序合法域名配置）
- [ ] 小程序合法域名白名单（request/uploadFile/downloadFile 域名须在小程序后台配置）
- [ ] token 过期与刷新机制
