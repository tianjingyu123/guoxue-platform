# 多租户一期本地隔离试点

## 当前真实集成验证入口

本目录现同时保存第一阶段 SQLite 试点和第二阶段真实 Nest/Prisma/PostgreSQL 验收器。正式候选源码位于 `apps/server/src/modules/managed-tenancy`、`apps/server/src/lease-main.ts` 和 `apps/admin/src/views/tenant/ManagedCustomerList.vue`，已在候选 `AppModule` 登记控制面与品牌模块；独立客户入口只加载专用最小模块。

当前状态和未完成项见[持续推进记录](../../docs/progress/多租户一期真实集成与持续推进-20261002.md)，最近完成批次见[微页面与品牌资源交接](../../docs/operations/多租户微页面消费与品牌小程序补齐-20261003.md)，[第一批验证](../../docs/operations/多租户真实数据库候选验证-20261002.md)保留。下文“无依赖、不改 AppModule”等仅适用于原 SQLite 试点。

复验前提：本任务自己的 PostgreSQL 16 集群已监听 `127.0.0.1:55467`；合成维护凭据、连接登记与只读账号保存在忽略的 `.runtime/postgres`，不能改成生产连接。`postgres-setup.mjs` 会只读核对 `postgres:mt_admin:55467`，只初始化 `mt_control/mt_customer_a/mt_customer_b` 及专用角色；其余数据库不在范围内。该脚本要求已有本任务集群和合成密码文件，不是生产部署安装器。

所有依赖必须属于本工作树。先按现有候选流程生成 `.prisma-candidate`，绝不覆盖其他任务客户端。编译产物和凭据都不进 Git。

```powershell
node scripts/ops/prisma-candidate/generate.mjs
node scripts/ops/prisma-candidate/assert-isolation.mjs
node pilots/managed-tenancy/postgres-setup.mjs
pnpm --filter @guoxue/server exec tsc -p ../../scripts/ops/prisma-candidate/tsconfig.candidate.json --noEmit false --outDir .prisma-candidate/server-build --tsBuildInfoFile .prisma-candidate/server-build.tsbuildinfo
pnpm --filter @guoxue/admin build
node pilots/managed-tenancy/verify-real-candidate.mjs
```

总验收器串行执行26套：控制面、租赁、独立认证、课程学习、内容经营、圈子、订单、会话、额度、围栏、完整退出、品牌及品牌课程、公共编排及独立消费、备份、切换回退、结构、受限控制面、关闭顺序、供应商模拟、原商业内核、编译入口、认证、SQLite及客户端隔离。它核对前后源码摘要一致；失败诊断仅留在忽略目录。默认报告位于 `.runtime/final-evidence`；归档时显式指定新目录，不覆盖历史报告。

运行账号 `mt_customer_a_runtime/mt_customer_b_runtime` 按当前 `managed-lease-permissions.ts` 的表及字段白名单授权，订单同时受固定RLS策略限制，经营写入受客户绑定及ACTIVE围栏约束。快照页、历史审计不可改删；合成准备账号与应用运行账号分开。控制面使用固定客户安全屏障视图，基础表、其他客户视图与任意配置不可读。启动精确核账号、库、端口、密钥摘要、字段权限、RLS及围栏，过宽授权拒绝启动。停机通过Nest生命周期先拒新HTTP和新业务处理，关闭HTTP后仍等待控制器业务（含客户端已断线的操作）归零，再释放本实例连接；Windows事件演练不等同Linux真实信号验收。实现与复验结果见[停机交接](../../docs/operations/多租户独立入口停机顺序与继续推进-20261003.md)。

`ui-preview.mjs` 是仅监听本机、使用合成超管和真实管理页的视觉验收器，不能放入部署启动命令。输入 `stop` 关闭本任务 UI/API。其虚拟入口不在生产前端构建里。

## 第一阶段 SQLite 试点（历史范围）

本目录是可执行的合成试点，独立于热卜正式 NestJS 服务。没有接入 `AppModule`，不读取生产环境变量、真实用户、商户、微信 AppID 或供应商凭据。它验证固定实例的数据归属、后台开通、数量授权、到期退出与品牌交易契约，为后续 NestJS/Prisma 适配提供可复验的边界。不能作为正式多租户已上线的证明。

本机已验证 Node `v24.17.0`，使用内置 `node:sqlite`、HTTP 和加密库；无安装步骤、`node_modules` 或生成 Prisma Client。`stripTypeScriptTypes` 会输出 experimental 提示；只用于加载同一候选内既有公共协议，正式构建应使用项目原有 TypeScript 流水线。

```powershell
node pilots/managed-tenancy/audit-source.mjs
node pilots/managed-tenancy/verify.mjs
```

验收器建立两个独立租赁客户与两个品牌站，启动各自独立进程，并额外启动同客户第二进程验证圈子并发配额；迁出时另启动恢复实例。端口由操作系统分配，只监听 `127.0.0.1`。结束后关闭本任务创建的进程与端口，不触碰其他任务服务。数据库、合成签名密钥及备份留在本目录忽略的 `.runtime/run-*` 中。该目录不得随客户导出、源码候选或生产包分发。

可将无凭据报告写到指定路径；报告包含源码 SHA-256、提交、运行版本、检查组和未覆盖范围：

```powershell
node pilots/managed-tenancy/verify.mjs docs/operations/tenant-pilot-evidence/verification-20261002.json
node pilots/managed-tenancy/audit-source.mjs docs/operations/tenant-pilot-evidence/source-audit-20261002.json
```

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `pilot.mjs` | 控制面与固定数据空间实例；认证、资源授权、圈子配额、合成订单、任务、导出与恢复 |
| `server.mjs` | 本机 HTTP 适配器、控制面开通入口和受控测试子进程；严格请求字段验证 |
| `migrations/001-pilot.sql` | 新建本地 SQLite 结构；不是 PostgreSQL 或已执行 Prisma 迁移 |
| `verify.mjs` | 独立进程 HTTP、跨客户攻击、事务回滚、生命周期和恢复验收 |
| `audit-source.mjs` | 固定候选现有源码的静态盘点；不冒充运行漏洞证明 |

## 最小开通流程

维护身份持有单独控制面 capability → 提交客户/应用/主体/模式与显式合同配置 → 控制面检查空间与选择器唯一归属 → `PREPARING` 持久化 → 初始化指定库 → 标记 `READY` 与审计 → 运维取得固定 descriptor → 独立实例启动 → 经固定应用认证产生用户令牌 → 执行业务。

`POST /provision` 只在控制面监听，接受单独维护令牌；客户管理员、客服、站长令牌不能调用。并发 HTTP 开通请求由单一控制面串行写入，SQLite 事务保证唯一归属；相同请求可恢复/重试，不同配置返回 409。失败保留 `PREPARING` 供查询与同请求恢复，不自动删除数据或重建不同库。

实例 descriptor 由维护路径提供；请求 Header、Host、查询参数和前端配置均不能切换数据库。`token/seed/renew/paymentEvent/runJob/backup` 是本地可信运维/合成验收适配方法，**没有客户 HTTP 路由**。它们不是生产 OAuth、续费扣款、支付回调、队列管理或备份权限接口。接入 NestJS 时只能注入到受维护身份保护的适配器，禁止暴露为通用客户控制器。

## 业务 HTTP 面

全部入口要求 `Authorization: Bearer ...` 与 `x-app-client` 同时有效。令牌绑定客户、数据空间、应用 audience、选择器、用户、认证修订与到期时间。角色和成员修订从当前业务主库读取；内部上下文对象也只能由本实例认证器签发。没有上下文则拒绝。

| 入口 | 边界 |
| --- | --- |
| `GET /context` | 返回分开的应用登记主体/交易主体和经营状态；不含凭据 |
| `GET /resources?kind=...&q=...`、`GET /resources/:id` | 固定空间、模块与资源白名单的交集；搜索和深链一致 |
| `PUT /resources` | 客户管理员仅更新授权商品标题；批量事务整组回滚；品牌站不能上传或修改商品 |
| `POST /circles` | 租赁客户管理员；事务内检查数量并创建，覆盖跨进程竞争 |
| `POST /chats`、`GET /chats/:id` | 指定智能体、客户知识域与本人历史会话；不调用真实模型 |
| `POST /orders`、`GET /orders/:id` | 合成下单及历史查询；应用主体和交易规则分开固化 |
| `POST /aftercare` | 既有订单授权范围内的合成售后登记；到期仍可处理 |
| `POST /presentation/preview` | 调用既有公共解析器，按模块收窄；无发布/回退引擎复制 |
| `POST /exports`、`GET /exports/:id` | 租赁客户管理员、导出保留期限、原申请人、额外临时下载授权；JSON 附件与审计 |
| `GET/POST /assets/:id` | 本地合成媒体正文；固定客户与上传人校验，不代表 COS ACL |
| `POST /cache`、`POST /jobs` | 合成缓存和任务边界验收接口；不代表 Redis/BullMQ 实测 |

圈子只验证数量与创建权限；没有开发完整成员/内容/直播模块。商品、课程只覆盖授权读取及合成订单，不是现有商城/课堂整体重构。

## 公共协议与未来适配

直接读取候选 `packages/shared/src/client-presentation.ts` 的 `parseClientPresentation`，不复制协议源码或读取其他窗口的 `dist`。保持 `applicationId/platform/channelId/clientKey` 四字段；合成 H5/小程序渠道不会写入正式 `APP_CHANNELS` 目录或伪装真实登记。

后续登记桥应由 `DistributionService.resolve` 取得服务端登记条目，再连接本专项维护的应用→数据空间映射；`clientKey` 是公开选择器，不能代替身份验证。`FeatureFlagService` 的运营裁决先计算，本专项授权只能进一步收窄。页面草稿/发布/回退继续归公共 `ClientPresentationService` 所有；试点仅进行配置消费与权限投影。

部署选择推荐为同一软件版本、独立进程/数据库/数据库账号；本地 SQLite 只验证归属与事务规则，不能验证 PostgreSQL 最小权限账号、操作系统 ACL、网络、资源限额或现有服务器容量。详见专项接收文档。
