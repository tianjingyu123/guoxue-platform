# 热卜国学平台 · 开发者 Onboarding 指南

> 2026-07-05 · Fable 5 编写 · 新开发者（人类或 AI）入职必读。读完本文 + docs/knowledge/项目Prompt知识库.md，即可安全上手。

---

## 1. 项目是什么

传统文化综合平台：排盘工具（引流·570 万存量用户）+ 内容（课程/古籍/诗词/电子书/圈子/直播/短视频）+ 电商（商城/商家入驻）+ B 端生态（站长分销/驿站线下/研究院师资/运营商团队）+ AI（伴读/智能体/创作辅助）。商业模式=存量工具用户 B 端化，收入=会员+课程商品抽佣+分佣生态。

## 2. 仓库与环境

```
guoxue-platform/            pnpm monorepo
├── apps/server             NestJS 10 后端（主战场）
├── apps/mobile             uni-app(Vue3) 移动端·H5/微信小程序/App 三端同码
├── apps/admin              Vue3+Element Plus 管理后台
├── docs/progress           进度文档（总账=唯一真源）
├── docs/design             设计方案（改业务先查这里有没有定过案）
└── docs/knowledge          本文档所在
本地起后端：仓库根 pnpm --filter @guoxue/server dev（根 .env 才全·端口3000）
本地起 H5：pnpm --filter @guoxue/mobile dev:h5（5173·勿重定向日志到文件）
数据库：PostgreSQL 本地 5433 · Redis 本地
生产：rebu-server(82.157.110.172) /opt/guoxue · PM2 guoxue-server · 端口3001 · nginx 前置
      https://api.rebugx.cn（API）· https://api.rebugx.cn/h5/（H5 同域）
```

## 3. 后端架构（apps/server）

- **模式**：单体模块化。src/modules/ 下 ~50 个业务模块，每模块 controller/service/dto/spec 四件套。公共层 src/common/（守卫/拦截器/装饰器/加密），基建 src/prisma、src/redis、src/config。
- **请求管线**：nginx → main.ts 全局链 = TracingInterceptor → LoggingInterceptor → ResponseInterceptor（统一 {code,data,message}，@SkipFormat 跳过）→ AuditInterceptor（@Auditable 记审计）→ RedisThrottleGuard（全局限流）→ SanitizePipe（XSS 转义，注意会碰 JSON 体）→ ValidationPipe（whitelist+transform）。
- **鉴权**：JWT（2h）+ refreshToken（UUID 存 Redis 7 天，轮换制，用户级索引 refresh:user:{id}，改密/封号即时撤销）。JwtStrategy 每请求查 DB 校验用户状态 + 比对撤销时间戳。角色：roles 表 + @Roles + RolesGuard（deny-by-default）。
- **Redis 用途**：缓存 / 分布式锁（runExclusive·cron 全量已包）/ 限流（incrWithTtl）/ 验证码 / websocket 在线态与 adapter。**Redis 不可用自动降级内存模式**（单实例语义，资金 cron critical 拒跑）。
- **websocket**：modules/websocket AppGateway（socket.io + Redis adapter，cluster 就绪）。房间约定：user:{id} / admin / circle:{id} / live:{id} / presence:{id}。
- **AI 网关**：modules/ai-gateway——模型路由（场景→模型，DB 配置热更新）/月度预算封顶/语义缓存/审计。Provider：DeepSeek 为主，Coze（智能体广场），腾讯云（审核）。
- **支付**：微信 V3 / 支付宝 / 银联 / 汇付斗拱（分账通道）四条链路，全部验签+防重放+幂等三重+金额比对。模拟支付开关用于未拿到真实商户号的场景。
- **审核三层漏斗**：敏感词库（DB 分级）→ 腾讯云审核 → DeepSeek 兜底复审。接入 9 个 UGC 模块。
- **配置体系**：ConfigSystem 表（运行时配置+功能开关 feature:*，改后清缓存）；第三方密钥走 ThirdPartyConfig（admin 配置→DB 加密→启动/保存热加载进 process.env）；地基密钥（DATABASE_URL/JWT_SECRET/ENCRYPTION_KEY）仍在 .env——**ENCRYPTION_KEY=永久不可变，改了全库密文报废**。

## 4. 数据库要点（Prisma·270+ 模型）

- 命名：模型 PascalCase 表；金额 Decimal；软删 deletedAt。
- 敏感数据 M4 加密：手机号三列制（phone 明文灰度保留 / phoneHash HMAC 查询用 / phoneEnc AES 密文）——查询一律走 phoneHash: phoneHmac(x)；生辰等同理。工具在 common/crypto.util。
- 资金核心表：Order（payTransactionId 幂等锚点）/ LedgerEntry（统一总账·净结算额=非 PENDING/FROZEN 之和）/ CommissionRecord / FundApproval（审批流·禁自审自批）/ VirtualCoinAccount+Recharge / MerchantSettlement。
- 迁移纪律：本地 prisma generate 必须 cd apps/server；生产只用 migrate diff 生成的只增 SQL + db execute；禁 db push。
- schema↔DB 一致性核查脚本：schema-db-check.ts。

## 5. 移动端架构（apps/mobile）

- uni-app 多端：一套 Vue3 代码编译 H5/微信小程序/App。**不是标准 Vue Web**：路由=pages.json+navigateTo；请求=utils/request.ts(apiGet/apiPost/apiGetPaged)；样式=rpx+scss；38 个分包 pkg-*。
- 数据层铁律：页面只 import lib/*-data.ts 导出的 xxxApi + 类型 + 纯函数；禁止直接 import mock；三态（loading/error/empty）+ submitting 防重复必须齐；scan-mock-imports.sh 是 CI 门槛。
- 小程序合规：R4 占卜类目条件编译隐藏；主包体积当前超标（5.81MB>2MB 上限，瘦身任务包已立）。

## 6. API 总览（按域）

前缀 /api/v1。Swagger 在 /api-docs（生产关闭）。速查（详细看各 controller）：

| 域 | 模块 | 说明 |
|---|---|---|
| 认证 | auth（register/login/sms/refresh/me）+ account | 短信验证码 dev 模式看控制台 |
| 用户 | user/users-me/wallet/points/payment-password | 钱包展示+提现审批流 |
| 内容 | course/classic/poetry/ebook/video/article/circle | 古籍 46 万章全文+AI 伴读 |
| 交易 | shop（订单/支付/回调）/coin/member/merchant | 商家=商品池唯一入口 |
| 分销 | commission/settlement/station/operator/channel-click | 归因 V2·灰度开关 |
| B 端 | merchant-backend/offline(驿站)/institute(研究院)/teacher | |
| AI | ai/ai-gateway/bot/advisor/creation-assist/marketing-content | |
| 运营 | dashboard/ops(任务池+一键接管)/audit/risk-control/track(埋点) | |
| 基建 | system(配置/密钥/品牌)/sms/upload/webhook/metrics/health | health 含 9 项依赖检查 |

## 7. 编码规范

- TypeScript strict；后端 any 已收敛勿新增；中文注释/中文 Swagger/中文 commit。
- commit 格式：`类型(域): 摘要`（fix/feat/docs/refactor），正文写清楚改了什么为什么，附验证结果。
- 测试：jest（406 套/5300+ 用例基线必须保持全绿）；service mock PrismaService 统一 jest.fn() 风格；controller spec overrideGuard。
- 每次改动的验证门槛：后端 tsc+jest；前端 vue-tsc+mock 扫描；提交前 git diff 核对只含本线改动（污染文件用 git apply --cached 摘 hunk）。
- 安全自检清单（新功能必过）：资金事务边界/金额校验/鉴权守卫/爆破防护/SSRF/上传安全/脱敏/禁纯随机/mock 残留/测试同步——详见根 CLAUDE.md 表格。

## 8. 部署与运维

部署流程见 docs/knowledge/项目Prompt知识库.md §四（bundle→build(内存参数!)→pm2→冒烟）。
关键运维事实：单机承载全部（API+DB+Redis+静态）；PM2 fork 单进程（cluster 前提已就绪待开启）；手动 pg_dump 备份（自动化任务包已立）；日志 pm2 logs；测试号 13912340099（redis 写码法登录）。

## 9. 新人第一天路径

1. 读本文 + 项目Prompt知识库.md（30 分钟）。
2. 读 docs/progress/总账（知道现在做到哪）+ docs/design/ 目录扫标题（知道哪些已定案）。
3. 本地跑起后端+H5，用测试号走一遍：登录→排盘→逛课程→下单（模拟支付）。
4. 挑总账最上面一项的任务包开工。有疑问先查 docs/，再查 git log 对应文件的 commit 说明——本项目的 commit 信息写得像文档，是第二知识库。
